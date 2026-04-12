import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:123@localhost:5432/election_system',
});

const electionId = 'd4f500d8-a8c5-4b45-9ef6-7f7de7a15cc6';

async function main() {
  await pool.query('BEGIN');

  try {
    await pool.query(
      `UPDATE elections
       SET title = $1,
           description = $2
       WHERE id = $3`,
      [
        'انتخابات مجلس النواب التجريبية 2026',
        'بيانات تجريبية لتشغيل النظام كاملًا',
        electionId,
      ],
    );

    await pool.query(
      `UPDATE districts
       SET name = CASE code
         WHEN 'D1' THEN 'الدائرة الأولى'
         WHEN 'D2' THEN 'الدائرة الثانية'
         ELSE name
       END
       WHERE election_id = $1`,
      [electionId],
    );

    await pool.query(
      `UPDATE quotas
       SET name = CASE name
         WHEN 'Women quota' THEN 'كوتا النساء'
         WHEN 'Christian' THEN 'كوتا المسيحيين'
         ELSE name
       END,
       description = CASE
         WHEN name IN ('Women quota', 'كوتا النساء') THEN 'مقاعد مخصصة للنساء'
         WHEN name IN ('Christian', 'كوتا المسيحيين') THEN 'مقاعد مخصصة للمسيحيين'
         ELSE description
       END
       WHERE election_id = $1`,
      [electionId],
    );

    const localCandidates = [
      ['D1', 1, 'أحمد خالد', 'قائمة النهضة'],
      ['D1', 2, 'سارة علي', 'قائمة النهضة'],
      ['D1', 3, 'محمد يوسف', 'قائمة النهضة'],
      ['D1', 4, 'ليث سمير', 'قائمة الكرامة'],
      ['D1', 5, 'ريم نبيل', 'قائمة الكرامة'],
      ['D1', 6, 'هبة محمود', 'قائمة الكرامة'],
      ['D2', 1, 'فاطمة عمر', 'قائمة الاتحاد'],
      ['D2', 2, 'يوسف إبراهيم', 'قائمة الاتحاد'],
      ['D2', 3, 'رنا أحمد', 'قائمة الاتحاد'],
    ];

    for (const [districtCode, candidateNumber, fullName, listName] of localCandidates) {
      await pool.query(
        `UPDATE candidates c
         SET full_name = $1,
             list_name = $2
         FROM districts d
         WHERE c.district_id = d.id
           AND d.code = $3
           AND c.candidate_number = $4
           AND c.kind = 'person'
           AND c.election_id = $5`,
        [fullName, listName, districtCode, candidateNumber, electionId],
      );
    }

    const partyCandidates = [
      [1, 'حزب التقدم'],
      [2, 'حزب العدالة'],
      [3, 'حزب الإرادة'],
    ];

    for (const [candidateNumber, partyName] of partyCandidates) {
      await pool.query(
        `UPDATE candidates
         SET full_name = $1,
             list_name = $1
         WHERE election_id = $2
           AND kind = 'party_list'
           AND candidate_number = $3`,
        [partyName, electionId, candidateNumber],
      );
    }

    const voters = [
      ['1234567890', 'محمد أحمد'],
      ['1234567891', 'ليان خالد'],
      ['1234567892', 'يوسف سمير'],
      ['1234567893', 'نور سمير'],
      ['1234567894', 'آية محمود'],
    ];

    for (const [nationalId, fullName] of voters) {
      await pool.query(
        `UPDATE voters
         SET full_name = $1
         WHERE election_id = $2
           AND national_id = $3`,
        [fullName, electionId, nationalId],
      );
    }

    await pool.query('COMMIT');

    const preview = await pool.query(
      `SELECT 'election' AS scope, title AS value FROM elections WHERE id = $1
       UNION ALL
       SELECT 'district', name FROM districts WHERE election_id = $1
       UNION ALL
       SELECT 'quota', name FROM quotas WHERE election_id = $1
       UNION ALL
       SELECT 'party', full_name FROM candidates WHERE election_id = $1 AND kind = 'party_list'
       UNION ALL
       SELECT 'voter', full_name FROM voters WHERE election_id = $1
       ORDER BY scope, value`,
      [electionId],
    );

    console.log(JSON.stringify(preview.rows, null, 2));
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
