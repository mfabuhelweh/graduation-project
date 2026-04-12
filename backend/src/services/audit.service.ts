import {Timestamp} from 'firebase-admin/firestore';
import {adminDb} from '../config/firebaseAdmin.js';
import {env} from '../config/env.js';
import {createId, memoryStore} from '../data/memoryStore.js';
import {query, usePostgres} from '../db/pool.js';

export async function addAuditLog(event: string, user: string, details: string) {
  if (env.enableMemoryStore) {
    const id = createId('audit');
    memoryStore.auditLogs.set(id, {
      id,
      event,
      user,
      details,
      time: new Date().toISOString(),
    });
    return {id};
  }

  if (usePostgres) {
    const result = await query<{id: string}>(
      `INSERT INTO audit_logs (actor_type, actor_id, action_type, target_table, target_id, details_json)
       VALUES ('system', NULL, $1, NULL, NULL, $2::jsonb)
       RETURNING id`,
      [event, JSON.stringify({actor: user, details})],
    );
    return {id: result.rows[0].id};
  }

  const docRef = await adminDb.collection('audit_logs').add({
    event,
    user,
    details,
    time: Timestamp.now(),
  });

  return {id: docRef.id};
}

export async function listAuditLogs(limit = 100) {
  if (env.enableMemoryStore) {
    return Array.from(memoryStore.auditLogs.values()).slice(-limit).reverse();
  }

  if (usePostgres) {
    const result = await query(
      `SELECT id,
              actor_type AS "actorType",
              actor_id AS "actorId",
              action_type AS event,
              details_json AS details,
              created_at AS time
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  const snapshot = await adminDb
    .collection('audit_logs')
    .orderBy('time', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
}
