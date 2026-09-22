-- Preserve the original classification for audit; historical A/A+ records cannot
-- be promoted to Rare Trade without evidence for all six new quality gates.
-- The marker keeps this migration idempotent because migrations run on startup.
UPDATE app.trades
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'gradingVersion', 2,
      'legacyRubricGrade', rubric_grade
    ),
    rubric_grade = CASE
      WHEN rubric_grade IS NULL THEN NULL
      WHEN rubric_grade IN ('A+', 'A', 'B') THEN 'B'
      WHEN rubric_grade = 'C' THEN 'C'
      ELSE 'D'
    END
WHERE metadata->>'gradingVersion' IS DISTINCT FROM '2';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trades_rubric_grade_abcd_check'
      AND conrelid = 'app.trades'::regclass
  ) THEN
    ALTER TABLE app.trades
      ADD CONSTRAINT trades_rubric_grade_abcd_check
      CHECK (rubric_grade IS NULL OR rubric_grade IN ('A', 'B', 'C', 'D'));
  END IF;
END $$;
