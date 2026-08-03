# Production MySQL switch (Hostinger)

Local development keeps `provider = "sqlite"` in `schema.prisma`.

## Go-live steps (do once on a clean MySQL DB)

1. Backup nothing required if empty DB.
2. Edit `packages/db/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

3. Set Hostinger `DATABASE_URL`:

```text
mysql://USER:PASSWORD@HOST:3306/DB?connection_limit=5
```

4. Create and apply the first migration:

```bash
pnpm db:generate
pnpm --filter @cc/db exec prisma migrate dev --name init_mysql
# On the server thereafter:
pnpm db:migrate:deploy
```

5. Commit `packages/db/prisma/migrations/**` to GitHub.

6. Optional seed (dev/staging only):

```bash
pnpm db:seed
```

**Never** run seed on production with default demo passwords without immediate rotation.

## Connection pooling

Hostinger shared MySQL often limits concurrent connections. Keep `connection_limit=5` (or lower) in `DATABASE_URL`.

## Indexes / FKs

All foreign keys and indexes are defined in `schema.prisma` (`@@index`, `@unique`, relations). After migrate deploy, verify with:

```sql
SHOW INDEX FROM RepairCase;
SHOW CREATE TABLE Lead;
```
