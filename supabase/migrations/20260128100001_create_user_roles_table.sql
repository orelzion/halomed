-- Create user roles table
-- Stores role assignments for admin access control
-- Reference: Phase 1 Analytics Foundation, Plan 01-01

-- Create enum type for app roles
CREATE TYPE app_role AS ENUM ('user', 'admin');

-- Create user_roles table
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE user_roles IS 'Stores role assignments for admin access control. Role is injected into JWT via Auth Hook.';
COMMENT ON COLUMN user_roles.user_id IS 'User ID from auth.users table';
COMMENT ON COLUMN user_roles.role IS 'User role: user (default) or admin';
COMMENT ON COLUMN user_roles.created_at IS 'Timestamp when role was assigned';
COMMENT ON COLUMN user_roles.updated_at IS 'Timestamp when role was last updated';

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can SELECT all rows
CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  USING ((SELECT (auth.jwt() ->> 'user_role')) = 'admin');

-- RLS Policy: Admins can INSERT rows
CREATE POLICY "Admins can assign roles"
  ON user_roles
  FOR INSERT
  WITH CHECK ((SELECT (auth.jwt() ->> 'user_role')) = 'admin');

-- RLS Policy: Admins can UPDATE rows
CREATE POLICY "Admins can update roles"
  ON user_roles
  FOR UPDATE
  USING ((SELECT (auth.jwt() ->> 'user_role')) = 'admin')
  WITH CHECK ((SELECT (auth.jwt() ->> 'user_role')) = 'admin');

-- RLS Policy: Users can SELECT their own row
CREATE POLICY "Users can view own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for common query patterns
CREATE INDEX idx_user_roles_role ON user_roles(role);
