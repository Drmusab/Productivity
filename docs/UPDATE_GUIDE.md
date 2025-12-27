# Update Guide

This guide explains how to update Productivity OS to a new version, handle migrations, and rollback if needed.

## Table of Contents

1. [Update Process](#update-process)
2. [Backup Before Update](#backup-before-update)
3. [Running Migrations](#running-migrations)
4. [Rollback Procedure](#rollback-procedure)
5. [Troubleshooting](#troubleshooting)

---

## Update Process

### Step 1: Check Current Version

```bash
# Check current app version
cat package.json | grep version

# Check current schema version
npm run migrate:status
```

### Step 2: Create a Backup

**Always backup before updating!**

```bash
# Full backup (recommended)
npm run backup

# Or using Docker
docker compose exec api npm run backup
```

### Step 3: Pull Latest Changes

```bash
# Stop running services
docker compose --profile prod down

# Pull latest code
git pull origin main

# Check the changelog for breaking changes
cat CHANGELOG.md
```

### Step 4: Update Dependencies

```bash
# Install new dependencies
cd apps/backend && npm install
cd ../desktop && npm install
cd ../../packages/shared && npm install
```

### Step 5: Rebuild Docker Images

```bash
# Rebuild all images
docker compose --profile prod build --no-cache
```

### Step 6: Run Migrations

```bash
# Start API temporarily for migrations
docker compose --profile prod up api -d

# Run migrations
docker compose exec api npm run migrate

# Check migration status
docker compose exec api npm run migrate:status
```

### Step 7: Start All Services

```bash
# Start all production services
docker compose --profile prod up -d

# Verify all services are healthy
docker compose ps
```

---

## Backup Before Update

### Creating a Backup

```bash
# Full backup (database + vault + attachments)
npm run backup

# Vault only
npm run backup:vault

# Database only
npm run backup:db
```

### Backup Location

Backups are stored in the `./backups/` directory (or as specified by `BACKUP_DIR`).

### Backup Format

```
backups/
└── backup-20250101-120000/
    ├── metadata.json       # Backup info and checksums
    ├── database/
    │   └── productivity.db # SQLite database copy
    └── vaults/
        └── ...             # Vault markdown files
```

### Restoring from Backup

```bash
# List available backups
npm run backup:list

# Restore from backup
npm run restore backups/backup-20250101-120000.tar.gz
```

---

## Running Migrations

### Automatic Migrations

Migrations run automatically when the application starts if:
1. The schema version in the database is lower than `SCHEMA_VERSION`
2. There are pending migration files

### Manual Migration Commands

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback
```

### Migration Files

Migrations are located in `apps/backend/migrations/`:

```
migrations/
├── 001_initial_schema.ts
├── 002_add_vault_tables.ts
├── 003_add_graph_indexes.ts
└── ...
```

### Creating a New Migration

```typescript
// migrations/004_add_new_feature.ts
export const version = 4;
export const name = 'add_new_feature';

export async function up(db: any): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS new_feature (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);
}

export async function down(db: any): Promise<void> {
  await db.run('DROP TABLE IF EXISTS new_feature');
}
```

---

## Rollback Procedure

### When to Rollback

- Critical bugs in new version
- Failed migrations
- Data corruption

### Rollback Steps

1. **Stop the application**
   ```bash
   docker compose --profile prod down
   ```

2. **Rollback to previous version**
   ```bash
   git checkout v1.0.0  # Previous version tag
   ```

3. **Rollback migrations (if needed)**
   ```bash
   npm run migrate:rollback
   ```

4. **Restore from backup (if needed)**
   ```bash
   npm run restore backups/backup-YYYYMMDD-HHMMSS.tar.gz
   ```

5. **Rebuild and restart**
   ```bash
   docker compose --profile prod build
   docker compose --profile prod up -d
   ```

### Emergency Rollback

If the application won't start:

```bash
# 1. Stop all containers
docker compose down

# 2. Remove potentially corrupted volumes (WARNING: data loss!)
# docker volume rm productivity-os-vault  # Only if necessary

# 3. Restore from backup
# Copy backup files manually to ./data/

# 4. Start with previous version
git checkout <previous-version>
docker compose --profile prod up -d
```

---

## Troubleshooting

### Migration Fails

**Symptom**: Error during migration

**Solution**:
```bash
# Check migration logs
docker compose logs api | grep -i migration

# Check schema_migrations table
sqlite3 data/productivity.db "SELECT * FROM schema_migrations"

# If partially applied, manually fix or rollback
npm run migrate:rollback
```

### Database Locked

**Symptom**: `SQLITE_BUSY: database is locked`

**Solution**:
```bash
# Stop all services
docker compose down

# Check for lingering processes
lsof data/productivity.db

# Restart services
docker compose --profile prod up -d
```

### Version Mismatch

**Symptom**: App version doesn't match database schema

**Solution**:
```bash
# Force migration check
npm run migrate

# Or rebuild database (WARNING: data loss!)
rm data/productivity.db
docker compose --profile prod up -d
```

### Container Won't Start

**Symptom**: Container exits immediately

**Solution**:
```bash
# Check container logs
docker compose logs api

# Check for port conflicts
docker compose ps
netstat -tlnp | grep 3001

# Rebuild container
docker compose --profile prod build --no-cache api
```

---

## Version History

| Version | Schema | Release Date | Notes |
|---------|--------|--------------|-------|
| 1.0.0   | 1      | 2025-01-01   | Initial release |

---

## Support

If you encounter issues during update:

1. Check the [GitHub Issues](https://github.com/Drmusab/AI-Integrated-Task-Manager/issues)
2. Review the error logs
3. Create a new issue with:
   - Current version
   - Target version
   - Error messages
   - Steps to reproduce
