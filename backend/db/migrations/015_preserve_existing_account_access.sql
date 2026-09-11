-- 014 may already have run on an existing installation before the entitlement
-- migration was corrected. Keep those previously created accounts whole too.
UPDATE app.app_users
   SET plan_type = 'PROFESSIONAL',
       account_status = 'active'
 WHERE plan_type = 'BASIC';
