# Production MySQL switch (Hostinger) — safest path

Local development keeps `provider = "sqlite"` in `schema.prisma`.

## Go-live (committed migration)

An init MySQL migration is committed at:

`packages/db/prisma/migrations/20260803120000_init_mysql/migration.sql`  
`packages/db/prisma/migrations/migration_lock.toml` → `provider = "mysql"`

### Steps

1. Create Hostinger MySQL database + user.
2. Set production `DATABASE_URL`:

```text
mysql://USER:PASSWORD@HOST:3306/DBNAME?connection_limit=5
```

3. Flip Prisma provider (release branch / Hostinger shell):

```bash
node scripts/switch-prisma-mysql.cjs
# → packages/db/prisma/schema.prisma provider = "mysql"
```

4. Generate client + deploy:

```bash
pnpm db:generate
pnpm db:migrate:deploy
```

5. Bootstrap owner (no demo seed):

```bash
ALLOW_PROD_BOOTSTRAP=1 NODE_ENV=production \
BOOTSTRAP_ADMIN_EMAIL=owner@yourdomain.com \
BOOTSTRAP_ADMIN_PASSWORD='ChooseALongPassword!' \
pnpm db:bootstrap:prod
```

6. **Never** run `pnpm db:seed` on production (blocked + demo passwords).

## Connection pooling

Shared MySQL: keep `connection_limit=5` (or lower) in `DATABASE_URL`.

## Indexes / FKs

Defined in `schema.prisma` and emitted in the MySQL migration (`CREATE TABLE` + indexes + FKs).

## Local SQLite after flip

If you flipped schema locally by mistake, change `provider` back to `"sqlite"` for day-to-day `db push` / seed. Do not commit sqlite provider on the production release branch.
