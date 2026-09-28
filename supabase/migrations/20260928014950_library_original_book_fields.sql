-- Reconciles production migration history with the repository.
-- The original book fields are already present in the canonical
-- 20260922203000_biblioteca_privada.sql migration, so this migration is
-- intentionally idempotent/no-op for fresh environments.

select 1;
