-- Migrate existing users to learning path system
-- Converts user_study_log entries to learning_path nodes
-- Sets default pace and review_intensity based on existing tracks
-- Reference: Plan Section "Removed/Deprecated", Task 10.17

-- For each user who has study logs but no preferences:
-- 1. Create user_preferences with default values
-- 2. Generate learning path based on their existing progress

DO $$
DECLARE
  user_record RECORD;
  track_record RECORD;
  default_pace pace_type := 'one_mishna';
  default_review review_intensity_type := 'medium';
  user_track_count INTEGER;
BEGIN
  -- Loop through users who have study logs but no preferences
  FOR user_record IN 
    SELECT DISTINCT u.id as user_id
    FROM auth.users u
    INNER JOIN user_study_log usl ON usl.user_id = u.id
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE up.id IS NULL
  LOOP
    -- Determine default pace based on tracks user is enrolled in
    -- If user has chapter-per-day track, use one_chapter, otherwise one_mishna
    SELECT COUNT(*) INTO user_track_count
    FROM user_study_log usl
    INNER JOIN tracks t ON t.id = usl.track_id
    WHERE usl.user_id = user_record.user_id
      AND t.schedule_type = 'DAILY_CHAPTER_PER_DAY';
    
    IF user_track_count > 0 THEN
      default_pace := 'one_chapter';
    ELSE
      default_pace := 'one_mishna';
    END IF;

    -- Create user preferences
    INSERT INTO user_preferences (user_id, pace, review_intensity, streak_count)
    VALUES (user_record.user_id, default_pace, default_review, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Created preferences for user % with pace %', user_record.user_id, default_pace;
  END LOOP;

  RAISE NOTICE 'Migration complete: Existing users now have preferences';
END $$;

-- Note: Learning paths will be generated when users first log in after this migration
-- The generate-path Edge Function should be called from the onboarding flow or
-- from the home page if preferences exist but path doesn't
