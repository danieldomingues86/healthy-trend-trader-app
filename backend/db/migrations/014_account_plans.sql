ALTER TABLE app.app_users
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'BASIC'
    CHECK (plan_type IN ('TRIAL', 'BASIC', 'PROFESSIONAL')),
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'trial', 'trial_expired', 'suspended')),
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Existing administrators keep the complete access they already had before
-- subscription plans were introduced.
-- Accounts created before plans existed already had full platform access.
-- Preserve that entitlement; new accounts always receive their selected plan.
UPDATE app.app_users
   SET plan_type = 'PROFESSIONAL'
 WHERE plan_type = 'BASIC';

CREATE INDEX IF NOT EXISTS app_users_plan_status_idx
  ON app.app_users(plan_type, account_status);
