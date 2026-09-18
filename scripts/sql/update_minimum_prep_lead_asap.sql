-- Momo's: remove 60-minute minimum prep lead (ASAP pickup for low-volume period).
-- Updates singleton admin_settings.data.orderingRules.minimumPrepLeadMinutes.
-- Rerun: psql "$DATABASE_URL" -f scripts/sql/update_minimum_prep_lead_asap.sql

UPDATE admin_settings
SET data = jsonb_set(
  data::jsonb,
  '{orderingRules,minimumPrepLeadMinutes}',
  '0'::jsonb,
  true
)
WHERE (data::jsonb -> 'orderingRules' ->> 'minimumPrepLeadMinutes')::int >= 60;
