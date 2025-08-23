#!/usr/bin/env node

/**
 * Database backup script
 * Creates timestamped backups of the database
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(chalk.red('❌ DATABASE_URL environment variable not set'));
  process.exit(1);
}

// Create backup directory if it doesn't exist
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(chalk.green(`✓ Created backup directory: ${BACKUP_DIR}`));
}

// Generate timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

console.log(chalk.bold('\n🗄️  Starting database backup...\n'));

try {
  // Parse database URL
  const url = new URL(DATABASE_URL);
  const dbName = url.pathname.slice(1);
  const host = url.hostname;
  const port = url.port || '5432';
  const username = url.username;
  const password = url.password;

  console.log(chalk.blue(`Database: ${dbName}`));
  console.log(chalk.blue(`Host: ${host}:${port}`));
  console.log(chalk.blue(`Backup file: ${backupFile}\n`));

  // Set PGPASSWORD environment variable for pg_dump
  const env = { ...process.env, PGPASSWORD: password };

  // Run pg_dump
  const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} -f "${backupFile}" --verbose --no-owner --no-acl`;
  
  execSync(command, { 
    env,
    stdio: 'inherit'
  });

  console.log(chalk.green.bold(`\n✅ Backup completed successfully!`));
  console.log(chalk.green(`Backup saved to: ${backupFile}`));

  // List recent backups
  console.log(chalk.bold('\n📋 Recent backups:\n'));
  try {
    const files = execSync(`ls -lh "${BACKUP_DIR}" | tail -5`, { encoding: 'utf8' });
    console.log(files);
  } catch (e) {
    // Ignore errors from ls command
  }

  // Cleanup old backups (keep last 10)
  try {
    const backupCount = execSync(`ls -1 "${BACKUP_DIR}" | wc -l`, { encoding: 'utf8' });
    const count = parseInt(backupCount.trim());
    
    if (count > 10) {
      console.log(chalk.yellow(`\n⚠️  Found ${count} backups. Cleaning up old backups (keeping last 10)...`));
      execSync(`cd "${BACKUP_DIR}" && ls -t | tail -n +11 | xargs rm -f`);
      console.log(chalk.green('✓ Old backups cleaned up'));
    }
  } catch (e) {
    // Ignore cleanup errors
  }

} catch (error) {
  console.error(chalk.red(`\n❌ Backup failed: ${error.message}`));
  process.exit(1);
}

// Restore instructions
console.log(chalk.bold('\n📖 To restore from this backup:\n'));
console.log(chalk.cyan(`psql $DATABASE_URL < ${backupFile}`));
console.log();