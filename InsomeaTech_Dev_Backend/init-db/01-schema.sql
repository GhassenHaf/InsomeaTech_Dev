-- =============================================================================
-- STEP 1: Create the insomea_tech schema
-- This must run first before any objects are created in the schema
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS insomea_tech;

-- Set search_path for this session and role
ALTER ROLE dev_user SET search_path TO insomea_tech, public;

COMMENT ON SCHEMA insomea_tech IS 'InsomeaTech application schema - contains all tables, functions, and business logic';
