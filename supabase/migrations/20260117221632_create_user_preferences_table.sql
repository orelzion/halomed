-- Create user_preferences table
-- Stores user onboarding choices (pace, review intensity) and streak tracking
-- Reference: Plan Section "Data Model Changes", backend.md Section "Database Schema"

-- Create enums for pace and review_intensity
CREATE TYPE pace_type AS ENUM ('one_mishna', 'two_mishna', 'one_chapter');
CREATE TYPE review_intensity_type AS ENUM ('none', 'light', 'medium', 'intensive');

-- Create user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pace pace_type NOT NULL,
  review_intensity review_intensity_type NOT NULL,
  streak_count INTEGER DEFAULT 0 NOT NULL,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user onboarding choices and streak tracking';
COMMENT ON COLUMN user_preferences.pace IS 'Learning pace: one_mishna, two_mishna, or one_chapter per day';
COMMENT ON COLUMN user_preferences.review_intensity IS 'Spaced repetition intensity: none, light, medium, or intensive';
COMMENT ON COLUMN user_preferences.streak_count IS 'Current consecutive days streak';
COMMENT ON COLUMN user_preferences.last_study_date IS 'Last date user completed a learning unit (for streak calculation)';

-- Create index on user_id for faster lookups (UNIQUE constraint already creates an index, but explicit is clearer)
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
