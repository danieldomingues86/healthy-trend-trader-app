-- Older records may still carry scores on a 0–10 scale. Normalize only those
-- records for comparisons/exports while retaining their original values.
UPDATE app.trades
SET metadata = metadata || jsonb_build_object(
      'legacyRubricScore', rubric_score,
      'legacyRubricMaxScore', rubric_max_score
    ),
    rubric_score = CASE WHEN rubric_score IS NULL THEN NULL
      ELSE LEAST(100, GREATEST(0, ROUND(rubric_score / rubric_max_score * 100, 1)))
    END,
    rubric_max_score = 100
WHERE rubric_max_score > 0 AND rubric_max_score <= 10;
