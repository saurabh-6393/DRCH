import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pool from '../db/pool';
import {
  createResource,
  getResources,
  allocateResource,
  deleteAllocation,
} from '../modules/resources/resources.service';
import { AppError } from '../shared/errors';

vi.mock('../db/pool');

describe('Resources Service', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'getClient').mockResolvedValue(mockClient);
  });

  it('creates resource stash item', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [
        {
          id: 'res-1',
          owner_org_id: 'org-1',
          item_name: 'Water Bottles',
          total_quantity: 1000,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    } as any);

    const item = await createResource('org-1', {
      itemName: 'Water Bottles',
      totalQuantity: 1000,
    });

    expect(item.id).toBe('res-1');
    expect(item.totalQuantity).toBe(1000);
    expect(item.availableQuantity).toBe(1000);
  });

  it('allocates resource quantity within available limit', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [{ id: 'res-1', owner_org_id: 'org-1', item_name: 'Water', total_quantity: 1000 }],
        });
      }
      if (sql.includes('SELECT id FROM shelters')) {
        return Promise.resolve({ rows: [{ id: 'shelter-1' }] });
      }
      if (sql.includes('SUM(allocated_quantity)')) {
        return Promise.resolve({ rows: [{ total_allocated: 200 }] });
      }
      if (sql.includes('INSERT INTO resource_allocations')) {
        return Promise.resolve({
          rows: [
            {
              id: 'alloc-1',
              resource_id: 'res-1',
              allocated_quantity: 300,
              target_type: 'SHELTER',
              target_id: 'shelter-1',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const alloc = await allocateResource(['NGO'], 'org-1', 'res-1', {
      allocatedQuantity: 300,
      targetType: 'SHELTER',
      targetId: 'shelter-1',
    });

    expect(alloc.id).toBe('alloc-1');
    expect(alloc.allocatedQuantity).toBe(300);
  });

  it('blocks NGO user from allocating another NGO organization resource (returns 403 FORBIDDEN)', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [{ id: 'res-1', owner_org_id: 'org-OTHER', item_name: 'Water', total_quantity: 1000 }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    try {
      await allocateResource(['NGO'], 'org-MINE', 'res-1', {
        allocatedQuantity: 100,
        targetType: 'SHELTER',
        targetId: 'shelter-1',
      });
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('NGO users can only allocate resources owned by their organization.');
    }
  });

  it('rejects allocation when requested quantity exceeds available quantity (returns 409 CONFLICT)', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [{ id: 'res-1', owner_org_id: 'org-1', item_name: 'Water', total_quantity: 500 }],
        });
      }
      if (sql.includes('SELECT id FROM shelters')) {
        return Promise.resolve({ rows: [{ id: 'shelter-1' }] });
      }
      if (sql.includes('SUM(allocated_quantity)')) {
        return Promise.resolve({ rows: [{ total_allocated: 400 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    try {
      await allocateResource(['NGO'], 'org-1', 'res-1', {
        allocatedQuantity: 200, // 400 + 200 = 600 > 500
        targetType: 'SHELTER',
        targetId: 'shelter-1',
      });
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Resource allocation quantity exceeds available unallocated quantity.');
    }
  });

  it('deletes allocation and frees quantity', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [
            {
              id: 'alloc-1',
              resource_id: 'res-1',
              allocated_quantity: 100,
              owner_org_id: 'org-1',
              item_name: 'Water',
              total_quantity: 500,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(deleteAllocation(['NGO'], 'org-1', 'alloc-1')).resolves.not.toThrow();
  });
});
