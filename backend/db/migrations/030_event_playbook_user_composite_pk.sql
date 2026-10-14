-- Migration 030: Chave primária composta (user_id, id) em app.event_playbook
-- Garante isolamento seguro entre múltiplos usuários para eventos e seeds compartilhados

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = 'app'
      AND table_name = 'event_playbook'
      AND constraint_name = 'event_playbook_pkey'
    GROUP BY constraint_name
    HAVING count(*) = 1
  ) THEN
    ALTER TABLE app.event_playbook DROP CONSTRAINT event_playbook_pkey;
    ALTER TABLE app.event_playbook ADD CONSTRAINT event_playbook_pkey PRIMARY KEY (user_id, id);
  END IF;
END $$;
