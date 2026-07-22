Migration bundle — SQLite → PostgreSQL

Overview

This repository already contains a migration script: server/migrate_sqlite_to_pg.js. It copies data from the embedded SQLite database (server/career-copilot.db) into a target PostgreSQL database using the DATABASE_URL environment variable.

This document explains how to run the migration safely on your production host **without sharing credentials** here.

Pre-migration checklist

1. Backup the SQLite DB (required):

   PowerShell:
   ```powershell
   cd server
   Copy-Item career-copilot.db career-copilot-backup.db -Force
   ```

   Linux/macOS:
   ```bash
   cd server
   cp career-copilot.db career-copilot-backup.db
   ```

2. Ensure Node and dependencies are installed on the migration host and that `pg` is available in server/node_modules. If not, run:

   ```bash
   cd server
   npm install --production pg
   ```

3. Confirm you have a PostgreSQL database endpoint and a user with privileges to CREATE TABLE and INSERT. If using Neon/Render/Railway, prepare a connection string in the form:

   postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require

   Do NOT expose this string publicly. Store it as an environment variable named DATABASE_URL in the environment where you'll run the migration.

Running the migration (safe, local execution)

1. On the host where the SQLite file is present (or copy the file there), set the DATABASE_URL environment variable and run the migration script:

   PowerShell:
   ```powershell
   cd server
   $env:DATABASE_URL = "postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require"
   node migrate_sqlite_to_pg.js
   ```

   Bash:
   ```bash
   cd server
   export DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require"
   node migrate_sqlite_to_pg.js
   ```

2. Script behavior:
   - Creates Postgres-compatible tables (if they don't exist).
   - Copies rows from SQLite tables to Postgres in an ordered sequence to satisfy FK-like ordering.
   - Attempts basic conflict handling; duplicate rows are skipped.
   - Updates sequences where possible.

3. Verify the script output for counts of copied rows and any errors saved to the console.

Post-migration verification

1. Connect to your Postgres DB and run quick counts for critical tables:

   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM applications;
   SELECT COUNT(*) FROM emails;
   SELECT COUNT(*) FROM resumes;
   ```

   Compare counts to the SQLite DB:

   PowerShell:
   ```powershell
   cd server
   node -e "const Database=require('better-sqlite3'); const db=new Database('career-copilot.db'); console.log('users', db.prepare('SELECT COUNT(*) as c FROM users').get().c); console.log('applications', db.prepare('SELECT COUNT(*) as c FROM applications').get().c);"
   ```

2. Spot-check records to ensure important fields (email, company, role, resume filenames) migrated correctly.

3. If things look good, set your server environment to use DATABASE_URL (don't remove the SQLite file until you are confident):

   Example environment variables (production):
   ```env
   DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
   NODE_ENV=production
   JWT_SECRET=...
   ENCRYPTION_KEY=...
   CSRF_SECRET=...
   ADMIN_EMAIL=...
   ADMIN_PASSWORD_HASH=...
   ADMIN_SECRET=...
   ```

Caveats & required app code changes

- The application currently uses better-sqlite3 and its synchronous API with helpers like `db.prepare(...)`, `db.transaction(...)`, and PRAGMA settings.
- Migrating data is separate from changing the app to use Postgres. After migration you must update server/db.js to connect to Postgres (node-postgres) and provide a compatibility wrapper exposing the methods the app expects (prepare.get/all/run, transaction helper, exec for migrations).

Recommended approaches:
1. Lightweight wrapper: implement a small wrapper module that uses `pg` and emulates the minimal `better-sqlite3` API used by the app. This can be done incrementally and is lower-risk for an immediate switch.
2. Use a query builder/ORM: migrate to knex, Objection, or TypeORM for robust cross-database queries and migrations. This is more work but provides clearer long-term benefits.

What I can provide next (choose):
- A ready-to-apply patch for server/db.js that adds a Postgres adapter (detects DATABASE_URL and uses pg with a thin compatibility layer). I can commit this to a feature branch for review.
- A migration verification checklist / SQL snippets to validate integrity after migration.
- Assistance running the migration on your production host if you supply the DATABASE_URL in your environment (do not paste it here if you prefer).

Security note

Treat your DATABASE_URL and any DB credentials as secrets. If you pasted them in any public place, rotate the credentials immediately.

Rollback plan

If anything goes wrong, you can:
1. Restore the SQLite file from the backup created earlier.
2. Re-point the app back to using the SQLite file (restore server/.env or remove DATABASE_URL) and restart.

Support

If you want, I can also:
- Commit a Postgres-ready db.js adapter to your branch and push it (no secrets required).
- Generate a PR with the migration script and the adapter changes for review.

--

Commands summary

- Backup SQLite:
  cp server/career-copilot.db server/career-copilot-backup.db

- Run migration:
  (set DATABASE_URL) && node server/migrate_sqlite_to_pg.js

- Verify counts (example):
  node -e "const db=require('better-sqlite3')('server/career-copilot.db'); console.log(db.prepare('SELECT COUNT(*) as c FROM users').get().c);"


If you want the adapter changes committed now so the app can run against Postgres after migration, confirm and I'll implement them and push to your branch.