-- Add missing columns to user_preferences that RxDB schema expects
-- These columns are needed for the client-side study day configuration

-- 1. Add skip_friday column (default: true - most users skip Friday study)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS skip_friday BOOLEAN NOT NULL DEFAULT true;

-- 2. Add skip_yom_tov column (default: true - skip Jewish holidays)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS skip_yom_tov BOOLEAN NOT NULL DEFAULT true;

-- 3. Add israel_mode column (default: false - diaspora mode with 2-day holidays)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS israel_mode BOOLEAN NOT NULL DEFAULT false;

-- 4. Add yom_tov_dates array column (pre-computed holiday dates, nullable)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS yom_tov_dates TEXT[] DEFAULT '{}';

-- 5. Add yom_tov_dates_until column (last date covered by yom_tov_dates, nullable)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS yom_tov_dates_until DATE DEFAULT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN user_preferences.skip_friday IS 'If true, user does not study on Fridays';
COMMENT ON COLUMN user_preferences.skip_yom_tov IS 'If true, user does not study on Jewish holidays';
COMMENT ON COLUMN user_preferences.israel_mode IS 'If true, use Israel holiday calendar (1 day); if false, use Diaspora (2 days)';
COMMENT ON COLUMN user_preferences.yom_tov_dates IS 'Pre-computed array of Yom Tov dates (YYYY-MM-DD strings)';
COMMENT ON COLUMN user_preferences.yom_tov_dates_until IS 'Last date covered by yom_tov_dates array';
