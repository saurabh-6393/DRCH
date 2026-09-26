import { getClient, query } from '../../db/pool';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import {
  CreateResourceInput,
  AllocateResourceInput,
  ResourceItem,
  ResourceAllocationItem,
} from './resources.types';
import { getIOServer } from '../../socket/socket.server';
import { logAudit } from '../audit/audit.service';

export async function createResource(
  userOrgId: string | null,
  input: CreateResourceInput
): Promise<ResourceItem> {
  const resourceId = crypto.randomUUID();
  const ownerOrgId = input.ownerOrgId !== undefined ? input.ownerOrgId : userOrgId;

  const sql = `
    INSERT INTO resources (id, owner_org_id, item_name, total_quantity, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, owner_org_id, item_name, total_quantity, created_at, updated_at
  `;

  const res = await query(sql, [
    resourceId,
    ownerOrgId,
    input.itemName,
    input.totalQuantity,
  ]);

  const row = res.rows[0];
  logger.info('Created resource item', { resourceId, itemName: input.itemName, totalQuantity: input.totalQuantity });

  return {
    id: row.id,
    ownerOrgId: row.owner_org_id,
    itemName: row.item_name,
    totalQuantity: Number(row.total_quantity),
    allocatedQuantity: 0,
    availableQuantity: Number(row.total_quantity),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getResources(): Promise<ResourceItem[]> {
  const sql = `
    SELECT 
      r.id,
      r.owner_org_id,
      r.item_name,
      r.total_quantity,
      COALESCE(SUM(a.allocated_quantity), 0)::int AS allocated_quantity,
      r.created_at,
      r.updated_at
    FROM resources r
    LEFT JOIN resource_allocations a ON r.id = a.resource_id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;

  const res = await query(sql);

  return res.rows.map((row) => {
    const total = Number(row.total_quantity);
    const allocated = Number(row.allocated_quantity);
    return {
      id: row.id,
      ownerOrgId: row.owner_org_id,
      itemName: row.item_name,
      totalQuantity: total,
      allocatedQuantity: allocated,
      availableQuantity: Math.max(0, total - allocated),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  });
}

export async function allocateResource(
  userRoles: string[],
  userOrgId: string | null,
  resourceId: string,
  input: AllocateResourceInput,
  actorId?: string,
  ipAddress?: string
): Promise<ResourceAllocationItem> {
  const client = await getClient();
  const allocationId = crypto.randomUUID();

  try {
    await client.query('BEGIN');

    // 1. Row lock resource record
    const resSql = `SELECT id, owner_org_id, item_name, total_quantity FROM resources WHERE id = $1 FOR UPDATE`;
    const resResult = await client.query(resSql, [resourceId]);

    if (resResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(404, 'NOT_FOUND', 'Resource item not found.');
    }

    const resource = resResult.rows[0];
    const isAuthorityOrAdmin = userRoles.includes('AUTHORITY') || userRoles.includes('ADMIN');

    // 2. Org-scoped RBAC check for NGO users
    if (!isAuthorityOrAdmin) {
      if (!userOrgId || resource.owner_org_id !== userOrgId) {
        await client.query('ROLLBACK');
        throw new AppError(
          403,
          'FORBIDDEN',
          'NGO users can only allocate resources owned by their organization.'
        );
      }
    }

    // 3. Validate target entity exists
    let targetCheckSql = '';
    if (input.targetType === 'INCIDENT') {
      targetCheckSql = `SELECT id FROM incidents WHERE id = $1`;
    } else if (input.targetType === 'SHELTER') {
      targetCheckSql = `SELECT id FROM shelters WHERE id = $1`;
    } else if (input.targetType === 'ORGANIZATION') {
      targetCheckSql = `SELECT id FROM organizations WHERE id = $1`;
    }

    const targetRes = await client.query(targetCheckSql, [input.targetId]);
    if (targetRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(404, 'NOT_FOUND', `Target ${input.targetType.toLowerCase()} not found.`);
    }

    // 4. Calculate total allocated quantity so far
    const allocSumSql = `
      SELECT COALESCE(SUM(allocated_quantity), 0)::int AS total_allocated
      FROM resource_allocations
      WHERE resource_id = $1
    `;
    const allocSumRes = await client.query(allocSumSql, [resourceId]);
    const currentAllocated = Number(allocSumRes.rows[0].total_allocated);
    const totalQuantity = Number(resource.total_quantity);

    if (currentAllocated + input.allocatedQuantity > totalQuantity) {
      await client.query('ROLLBACK');
      throw new AppError(
        409,
        'CONFLICT',
        'Resource allocation quantity exceeds available unallocated quantity.'
      );
    }

    // 5. Insert allocation record
    const insertSql = `
      INSERT INTO resource_allocations (
        id, resource_id, allocated_quantity, target_type, target_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, resource_id, allocated_quantity, target_type, target_id, created_at, updated_at
    `;
    const allocResult = await client.query(insertSql, [
      allocationId,
      resourceId,
      input.allocatedQuantity,
      input.targetType,
      input.targetId,
    ]);

    await logAudit(
      {
        action: 'RESOURCE_ALLOCATED',
        actorId: actorId || null,
        targetType: 'RESOURCE_ALLOCATION',
        targetId: allocationId,
        metadata: {
          resourceId,
          quantity: input.allocatedQuantity,
          targetType: input.targetType,
          targetId: input.targetId,
        },
        ipAddress,
      },
      client
    );

    await client.query('COMMIT');

    const row = allocResult.rows[0];
    const allocationItem: ResourceAllocationItem = {
      id: row.id,
      resourceId: row.resource_id,
      allocatedQuantity: Number(row.allocated_quantity),
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };

    logger.info('Allocated resource quantity', { resourceId, allocationId, allocatedQuantity: input.allocatedQuantity, targetType: input.targetType });

    // Broadcast allocation update to dispatchers
    const io = getIOServer();
    if (io) {
      io.of('/live/dispatchers').to('dispatchers_room').emit('RESOURCE_ALLOCATION_UPDATED', {
        resourceId,
        itemName: resource.item_name,
        allocatedQuantity: Number(row.allocated_quantity),
        availableQuantity: totalQuantity - (currentAllocated + input.allocatedQuantity),
        targetType: row.target_type,
        targetId: row.target_id,
      });
    }

    return allocationItem;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Database transaction failed during resource allocation.');
  } finally {
    client.release();
  }
}

export async function deleteAllocation(
  userRoles: string[],
  userOrgId: string | null,
  allocationId: string,
  actorId?: string,
  ipAddress?: string
): Promise<void> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Fetch allocation and parent resource
    const fetchSql = `
      SELECT a.id, a.resource_id, a.allocated_quantity, r.owner_org_id, r.item_name, r.total_quantity
      FROM resource_allocations a
      JOIN resources r ON a.resource_id = r.id
      WHERE a.id = $1
      FOR UPDATE
    `;
    const res = await client.query(fetchSql, [allocationId]);

    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(404, 'NOT_FOUND', 'Resource allocation not found.');
    }

    const alloc = res.rows[0];
    const isAuthorityOrAdmin = userRoles.includes('AUTHORITY') || userRoles.includes('ADMIN');

    // 2. Org-scoped check
    if (!isAuthorityOrAdmin) {
      if (!userOrgId || alloc.owner_org_id !== userOrgId) {
        await client.query('ROLLBACK');
        throw new AppError(
          403,
          'FORBIDDEN',
          'NGO users can only delete allocations for resources owned by their organization.'
        );
      }
    }

    // 3. Delete allocation
    await client.query(`DELETE FROM resource_allocations WHERE id = $1`, [allocationId]);

    await logAudit(
      {
        action: 'RESOURCE_ALLOCATION_DELETED',
        actorId: actorId || null,
        targetType: 'RESOURCE_ALLOCATION',
        targetId: allocationId,
        metadata: {
          resourceId: alloc.resource_id,
          releasedQuantity: Number(alloc.allocated_quantity),
        },
        ipAddress,
      },
      client
    );

    await client.query('COMMIT');

    logger.info('Deleted resource allocation', { allocationId, resourceId: alloc.resource_id });

    // Broadcast allocation update to dispatchers
    const io = getIOServer();
    if (io) {
      io.of('/live/dispatchers').to('dispatchers_room').emit('RESOURCE_ALLOCATION_UPDATED', {
        resourceId: alloc.resource_id,
        itemName: alloc.item_name,
        allocationDeleted: allocationId,
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Database transaction failed during allocation deletion.');
  } finally {
    client.release();
  }
}
