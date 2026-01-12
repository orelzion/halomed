-- Create user_study_log table
-- Represents scheduled units and completion state per user
-- Reference: TDD Section 4.3, backend.md Section 3

CREATE TABLE user_study_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  study_date DATE NOT NULL,
  content_id UUID REFERENCES content_cache(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, study_date, track_id)
);

-- Add comments for documentation
COMMENT ON TABLE user_study_log IS 'Represents scheduled units and completion state per user';
COMMENT ON COLUMN user_study_log.study_date IS 'Date stored as DATE (no time) in UTC. Clients interpret based on device timezone';
COMMENT ON COLUMN user_study_log.is_completed IS 'Completion status for this scheduled unit';
COMMENT ON COLUMN user_study_log.completed_at IS 'Timestamp when the unit was marked as completed';

-- Create indexes for common query patterns
CREATE INDEX idx_user_study_log_user_id ON user_study_log(user_id);
CREATE INDEX idx_user_study_log_track_id ON user_study_log(track_id);
CREATE INDEX idx_user_study_log_study_date ON user_study_log(study_date);
CREATE INDEX idx_user_study_log_user_track ON user_study_log(user_id, track_id);
