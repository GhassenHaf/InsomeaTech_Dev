-- =============================================================================
-- STEP 4: Load seed/data from your local files
-- =============================================================================
-- 
-- IMPORTANT: Replace this file with your actual seed data SQL
-- 
-- To add your own seed data:
-- 1. Replace the contents of this file with your INSERT statements
-- 2. Docker will automatically execute all .sql files in alphabetical order
--
-- The tables are ready and empty. Add your data here!
--

-- Placeholder - no data loaded by default
SET search_path TO insomea_tech, public;

-- Your seed data SQL goes here
-- Example:
-- INSERT INTO insomea_tech.distis (id, "name", email_support, phone, status) 
--   VALUES (gen_random_uuid(), 'Your Company', 'support@example.com', '555-0000', 'Active');

RESET search_path;

-- Verification - shows table status
SELECT 
  'Tables initialized - Ready for seed data import' as status,
  (SELECT COUNT(*) FROM insomea_tech.distis) as distis_count,
  (SELECT COUNT(*) FROM insomea_tech.products) as products_count,
  (SELECT COUNT(*) FROM insomea_tech.users) as users_count,
  (SELECT COUNT(*) FROM insomea_tech.customers) as customers_count,
  (SELECT COUNT(*) FROM insomea_tech.orders) as orders_count;

