import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import 'dotenv/config';
import { runSqlFile } from '../src/db/sqlRunner.js';
import { pool } from '../src/db/pool.js';

const migrationsDir = resolve(process.cwd(), 'database/migrations');

try {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    await runSqlFile(resolve(migrationsDir, file));
    console.log(`Executed migration ${file}`);
  }
} finally {
  await pool.end();
}
