-- Add cost tracking columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('gemini', 'grok'));
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 6);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS estimated_input_tokens INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS estimated_output_tokens INTEGER;

-- Create index for cost analytics
CREATE INDEX IF NOT EXISTS idx_sessions_provider ON sessions(provider);
