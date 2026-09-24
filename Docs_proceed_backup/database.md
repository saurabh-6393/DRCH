# Database

> The single source of truth for your data model. When you open a NEW chat, the AI reads
> this instead of guessing your schema — so it never re-invents your tables.
> Keep this file updated the moment the schema changes.

## Conventions
- **Primary keys:** <e.g. `uuid` default `gen_random_uuid()`>
- **Timestamps:** every table has `created_at`, `updated_at` (`timestamptz`)
- **Naming:** <snake_case tables (plural), snake_case columns>
- **Soft deletes:** <yes/no — `deleted_at` nullable?>

## Tables

### users
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | unique, not null |
| password_hash | text | null if OAuth-only |
| role | enum(`user`,`admin`) | default `user` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### <object>  <!-- e.g. projects, orders, posts -->
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| <field> | <type> | <notes> |
| status | enum(`...`) | |
| created_at | timestamptz | |

### <join / child table>
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| <parent>_id | uuid | FK → <parent>.id |
| <field> | <type> | |

## Relationships
- `users` 1 ──< `<object>` (a user has many <object>)
- `<object>` 1 ──< `<child>` (one <object> has many <child>)

## Indexes
- `users(email)` — unique
- `<object>(user_id)` — lookups by owner
- <...>

## Migrations note
- <where migrations live, e.g. `/migrations` or Prisma/Drizzle schema file>
- Never edit the DB directly in prod — always a migration.
