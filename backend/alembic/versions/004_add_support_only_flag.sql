-- Migration: Add is_support_only flag to api_keys
-- Created: 2026-02-21

-- Add column with default False (existing keys are regular API keys)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_support_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_keys_support_only ON api_keys(is_support_only);

-- Add comment
COMMENT ON COLUMN api_keys.is_support_only IS 'If true, key can only be used for support bot, not for API requests';
