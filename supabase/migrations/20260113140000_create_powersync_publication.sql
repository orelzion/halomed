-- Create PowerSync publication for logical replication
-- This publication is required for PowerSync to sync data from Supabase
-- Reference: PowerSync documentation on PostgreSQL logical replication

-- Create publication named 'powersync'
CREATE PUBLICATION powersync FOR ALL TABLES;

-- Grant usage on schema to postgres (if needed)
-- Note: PowerSync connection uses 'postgres' user which should already have access

-- Verify publication was created
-- You can check with: SELECT * FROM pg_publication WHERE pubname = 'powersync';
