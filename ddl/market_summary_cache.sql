-- Create table for caching market summaries
CREATE TABLE IF NOT EXISTS market_summary_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_market_summary_expires ON market_summary_cache(expires_at);

-- Function to clean up expired summaries
CREATE OR REPLACE FUNCTION cleanup_expired_summaries()
RETURNS void AS $$
BEGIN
  DELETE FROM market_summary_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;