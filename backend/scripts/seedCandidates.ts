/**
 * seedCandidates.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * يقرأ ملف local-districts-sample.json ويُدخل بياناته في قاعدة البيانات:
 *   1. يجد أول انتخابات موجودة في جدول elections
 *   2. يُنشئ الدوائر (districts) إن لم تكن موجودة
 *   3. يُنشئ المرشحين (candidates) لكل قائمة وكل دائرة
 *
 * الاستخدام:
 *   npx tsx backend/scripts/seedCandidates.ts
 *   npx tsx backend/scripts/seedCandidates.ts --election-id=<uuid>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool, query } from '../src/db/pool.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CandidateEntry {
  order: number;
  name: string;
  seatType: 'تنافس' | 'كوتا المرأة' | 'مسيحي' | string;
}

interface ListEntry {
  listNumber: number;
  name: string;
  candidates: CandidateEntry[];
}

interface DistrictEntry {
  name: string;
  lists: ListEntry[];
}

interface SeedData {
  districts: DistrictEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string)   { console.log(`  ✅  ${msg}`); }
function warn(msg: string)  { console.warn(`  ⚠️   ${msg}`); }
function title(msg: string) { console.log(`\n${'─'.repeat(60)}\n  ${msg}\n${'─'.repeat(60)}`); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ─── 1. قراءة ملف البيانات ─────────────────────────────────────────────────
  const jsonPath = resolve(process.cwd(), 'backend/src/data/local-districts-sample.json');
  const raw = await readFile(jsonPath, 'utf-8');
  const seedData: SeedData = JSON.parse(raw);

  title('🌱 بدء تعبئة بيانات المرشحين');
  console.log(`  📄  تم تحميل ${seedData.districts.length} دوائر من الملف`);

  // ─── 2. تحديد الانتخابات المستهدفة ────────────────────────────────────────
  let electionId: string | null = null;

  // دعم --election-id=<uuid> كـ argument
  const electionArg = process.argv.find(a => a.startsWith('--election-id='));
  if (electionArg) {
    electionId = electionArg.split('=')[1];
    console.log(`  🎯  استخدام انتخابات محددة: ${electionId}`);
  } else {
    // أحدث انتخابات موجودة
    const result = await query('SELECT id, title FROM elections ORDER BY created_at DESC LIMIT 1');
    if (!result.rows[0]) {
      console.error('\n  ❌  لا توجد انتخابات في قاعدة البيانات. أنشئ انتخابات أولاً من لوحة الأدمن.\n');
      process.exit(1);
    }
    electionId = result.rows[0].id as string;
    console.log(`  🗳️   انتخابات مستهدفة: "${result.rows[0].title}" (${electionId})`);
  }

  let totalDistricts = 0;
  let totalCandidates = 0;
  let skippedDistricts = 0;
  let skippedCandidates = 0;

  // ─── 3. إدراج الدوائر والمرشحين ───────────────────────────────────────────
  for (const districtData of seedData.districts) {
    title(`📍 دائرة: ${districtData.name}`);

    // إنشاء الدائرة أو الحصول عليها إذا كانت موجودة
    const districtCode = districtData.name.replace(/\s+/g, '-').toLowerCase();

    let districtId: string;
    const existing = await query(
      'SELECT id FROM districts WHERE election_id = $1 AND code = $2',
      [electionId, districtCode],
    );

    if (existing.rows[0]) {
      districtId = existing.rows[0].id as string;
      warn(`الدائرة "${districtData.name}" موجودة بالفعل (${districtId})`);
      skippedDistricts++;
    } else {
      const seatsCount = districtData.lists.reduce(
        (sum, l) => sum + l.candidates.length, 0
      );
      const insResult = await query(
        `INSERT INTO districts (election_id, name, code, seats_count)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [electionId, districtData.name, districtCode, seatsCount],
      );
      districtId = insResult.rows[0].id as string;
      log(`أُنشئت الدائرة "${districtData.name}" ← ${districtId}`);
      totalDistricts++;
    }

    // ─── إدراج المرشحين لكل قائمة ────────────────────────────────────────
    let candidateNumber = 1;

    for (const list of districtData.lists) {
      console.log(`\n     📋  قائمة ${list.listNumber}: ${list.name} (${list.candidates.length} مرشحين)`);

      for (const candidate of list.candidates) {
        const fullName = candidate.name.trim();

        // تحقق من عدم التكرار
        const dupCheck = await query(
          `SELECT id FROM candidates
           WHERE election_id = $1 AND district_id = $2 AND full_name = $3`,
          [electionId, districtId, fullName],
        );

        if (dupCheck.rows[0]) {
          warn(`   مرشح موجود بالفعل: ${fullName}`);
          skippedCandidates++;
          continue;
        }

        await query(
          `INSERT INTO candidates
             (election_id, district_id, kind, full_name, list_name, candidate_number)
           VALUES ($1, $2, 'person', $3, $4, $5)`,
          [electionId, districtId, fullName, list.name, candidateNumber],
        );

        console.log(`        ✔  [${candidateNumber}] ${fullName} — ${list.name} (${candidate.seatType})`);
        candidateNumber++;
        totalCandidates++;
      }
    }
  }

  // ─── 4. ملخص ──────────────────────────────────────────────────────────────
  title('📊 ملخص التعبئة');
  console.log(`  🏘️   دوائر مُنشأة:    ${totalDistricts}`);
  console.log(`  ⏭️   دوائر موجودة:    ${skippedDistricts}`);
  console.log(`  👤  مرشحون مُضافون:  ${totalCandidates}`);
  console.log(`  ⏭️   مرشحون موجودون: ${skippedCandidates}`);
  console.log(`\n  ✅  اكتملت تعبئة البيانات بنجاح!\n`);
}

main()
  .catch((err) => {
    console.error('\n  ❌  فشلت التعبئة:', err.message);
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
