-- Create user_consent_preferences table
-- Stores user consent preferences for GDPR compliance
-- Reference: tasks.md Section 12, Task 12.1

CREATE TABLE IF NOT EXISTS public.user_consent_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analytics_consent BOOLEAN NOT NULL DEFAULT false,
    marketing_consent BOOLEAN NOT NULL DEFAULT false,
    functional_consent BOOLEAN NOT NULL DEFAULT false,
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_country TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.user_consent_preferences IS 'Stores user consent preferences for GDPR compliance';
COMMENT ON COLUMN public.user_consent_preferences.analytics_consent IS 'User consent for analytics tracking';
COMMENT ON COLUMN public.user_consent_preferences.marketing_consent IS 'User consent for marketing communications';
COMMENT ON COLUMN public.user_consent_preferences.functional_consent IS 'User consent for functional/required features';
COMMENT ON COLUMN public.user_consent_preferences.consent_version IS 'Version of consent policy when user consented';
COMMENT ON COLUMN public.user_consent_preferences.ip_country IS 'Country code from user IP when consent was given';

-- Enable RLS
ALTER TABLE public.user_consent_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own consent
CREATE POLICY "Users can view their own consent"
    ON public.user_consent_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent"
    ON public.user_consent_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consent"
    ON public.user_consent_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_consent_preferences_user_id ON public.user_consent_preferences(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_consent_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_consent_preferences_updated_at
    BEFORE UPDATE ON public.user_consent_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_consent_preferences_updated_at();
