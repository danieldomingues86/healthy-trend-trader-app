-- Keep the configured risk for the existing A, B and C policies. The former
-- A+ risk is deliberately not promoted to the new Rare Trade grade.
-- UI/API normalization applies the same shape to browser-cached policies.
UPDATE app.risk_policies AS p
SET policy = jsonb_set(
  p.policy || '{"gradingVersion":2}'::jsonb,
  '{grades}',
  jsonb_build_array(
    jsonb_build_object('grade', 'A', 'minScore', 95, 'riskPct', COALESCE(
      (SELECT entry.value->'riskPct' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.policy->'grades') = 'array' THEN p.policy->'grades' ELSE '[]'::jsonb END) AS entry(value) WHERE entry.value->>'grade' = 'A' LIMIT 1),
      to_jsonb(0.004::numeric)
    )),
    jsonb_build_object('grade', 'B', 'minScore', 80, 'riskPct', COALESCE(
      (SELECT entry.value->'riskPct' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.policy->'grades') = 'array' THEN p.policy->'grades' ELSE '[]'::jsonb END) AS entry(value) WHERE entry.value->>'grade' = 'B' LIMIT 1),
      to_jsonb(0.002::numeric)
    )),
    jsonb_build_object('grade', 'C', 'minScore', 65, 'riskPct', COALESCE(
      (SELECT entry.value->'riskPct' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.policy->'grades') = 'array' THEN p.policy->'grades' ELSE '[]'::jsonb END) AS entry(value) WHERE entry.value->>'grade' = 'C' LIMIT 1),
      to_jsonb(0.001::numeric)
    )),
    jsonb_build_object('grade', 'D', 'minScore', null, 'riskPct', 0)
  )
)
WHERE p.policy->>'gradingVersion' IS DISTINCT FROM '2';
