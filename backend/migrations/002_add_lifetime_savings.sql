-- Migration: Add lifetime_savings to balances table
-- Created: 2026-02-14

-- Add new column for tracking savings vs OpenRouter direct pricing
ALTER TABLE balances 
ADD COLUMN IF NOT EXISTS lifetime_savings NUMERIC(12, 6) NOT NULL DEFAULT 0.00;

-- Update existing balances to have 0 savings (will be populated going forward)
UPDATE balances SET lifetime_savings = 0.00 WHERE lifetime_savings IS NULL;

-- Verify migration
SELECT 
    user_id, 
    balance_usd, 
    lifetime_spent, 
    lifetime_earned, 
    lifetime_savings 
FROM balances 
LIMIT 5;
