import {resolve} from 'node:path';
import 'dotenv/config';
import {runSqlFile} from '../src/db/sqlRunner.js';
import {pool} from '../src/db/pool.js';

const file = process.argv[2];

if (!file) {
  console.error('Usage: tsx backend/scripts/run-sql.ts <sql-file>');
  process.exit(1);
}

try {
  await runSqlFile(resolve(process.cwd(), file));
  console.log(`Executed ${file}`);
} finally {
  await pool.end();
}
