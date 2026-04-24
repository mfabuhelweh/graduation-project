ALTER TABLE districts
  ADD COLUMN IF NOT EXISTS governorate_name text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'districts_governorate_name_not_blank'
  ) THEN
    ALTER TABLE districts
      ADD CONSTRAINT districts_governorate_name_not_blank CHECK (
        governorate_name IS NULL OR length(trim(governorate_name)) > 0
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_districts_governorate_name
  ON districts (governorate_name);

UPDATE districts
SET governorate_name = CASE
  WHEN governorate_name IS NOT NULL AND length(trim(governorate_name)) > 0 THEN trim(governorate_name)
  WHEN upper(code) LIKE 'AMM%' OR lower(name) LIKE '%amman%' OR name LIKE '%العاصمة%' THEN 'عمان'
  WHEN upper(code) LIKE 'IRB%' OR lower(name) LIKE '%irbid%' OR name LIKE '%إربد%' OR name LIKE '%اربد%' THEN 'إربد'
  WHEN upper(code) LIKE 'ZAR%' OR lower(name) LIKE '%zarqa%' OR name LIKE '%الزرقاء%' THEN 'الزرقاء'
  WHEN upper(code) LIKE 'BAL%' OR lower(name) LIKE '%balqa%' OR name LIKE '%البلقاء%' THEN 'البلقاء'
  WHEN upper(code) LIKE 'KAR%' OR lower(name) LIKE '%karak%' OR name LIKE '%الكرك%' THEN 'الكرك'
  WHEN upper(code) LIKE 'MAA%' OR lower(name) LIKE '%maan%' OR lower(name) LIKE '%ma''an%' OR name LIKE '%معان%' THEN 'معان'
  WHEN upper(code) LIKE 'TAF%' OR lower(name) LIKE '%tafila%' OR name LIKE '%الطفيلة%' THEN 'الطفيلة'
  WHEN upper(code) LIKE 'JER%' OR lower(name) LIKE '%jerash%' OR name LIKE '%جرش%' THEN 'جرش'
  WHEN upper(code) LIKE 'AJL%' OR lower(name) LIKE '%ajloun%' OR name LIKE '%عجلون%' THEN 'عجلون'
  WHEN upper(code) LIKE 'MAD%' OR lower(name) LIKE '%madaba%' OR name LIKE '%مادبا%' THEN 'مادبا'
  WHEN upper(code) LIKE 'AQA%' OR lower(name) LIKE '%aqaba%' OR name LIKE '%العقبة%' THEN 'العقبة'
  WHEN upper(code) LIKE 'MAF%' OR lower(name) LIKE '%mafraq%' OR name LIKE '%المفرق%' THEN 'المفرق'
  WHEN upper(code) = 'BADIA_NORTH' OR lower(name) LIKE '%badia north%' OR name LIKE '%البادية الشمالية%' THEN 'البادية الشمالية'
  WHEN upper(code) = 'BADIA_CENTER' OR lower(name) LIKE '%badia center%' OR lower(name) LIKE '%badia central%' OR name LIKE '%البادية الوسطى%' THEN 'البادية الوسطى'
  WHEN upper(code) = 'BADIA_SOUTH' OR lower(name) LIKE '%badia south%' OR name LIKE '%البادية الجنوبية%' THEN 'البادية الجنوبية'
  ELSE name
END;

UPDATE voters
SET gender = CASE
  WHEN random() < 0.5 THEN 'male'::candidate_gender
  ELSE 'female'::candidate_gender
END
WHERE gender IS NULL;

UPDATE voters
SET age = CASE
  WHEN birth_date IS NOT NULL
    THEN GREATEST(EXTRACT(YEAR FROM age(current_date, birth_date))::int, 18)
  ELSE (floor(random() * 43) + 19)::int
END
WHERE age IS NULL OR age < 18;
