-- =============================================================================
-- STEP 2: Create trigger functions
-- These functions are required by table triggers (created in next step)
-- =============================================================================

-- Function to automatically update the updated_at timestamp column
CREATE OR REPLACE FUNCTION insomea_tech.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insomea_tech.update_updated_at_column() IS 'Automatically updates the updated_at timestamp on record modification';

-- Function to automatically update the last_modified_date timestamp column
CREATE OR REPLACE FUNCTION insomea_tech.update_last_modified_date_column()
RETURNS trigger AS $$
BEGIN
  NEW.last_modified_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insomea_tech.update_last_modified_date_column() IS 'Automatically updates the last_modified_date timestamp on record modification';
