import {readFile} from 'node:fs/promises';
import {pool} from './pool.js';

export async function runSqlFile(path: string) {
  const sql = await readFile(path, 'utf8');
  await pool.query(sql);
}
