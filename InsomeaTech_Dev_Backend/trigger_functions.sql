CREATE OR REPLACE FUNCTION insomea_tech.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insomea_tech.update_last_modified_date_column()
RETURNS trigger AS $$
BEGIN
  NEW.last_modified_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
