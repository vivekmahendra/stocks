-- Create table for caching company narratives
CREATE TABLE IF NOT EXISTS company_narrative_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  narrative TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_company_narrative_symbol ON company_narrative_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_company_narrative_expires ON company_narrative_cache(expires_at);

-- Function to clean up expired narratives
CREATE OR REPLACE FUNCTION cleanup_expired_narratives()
RETURNS void AS $$
BEGIN
  DELETE FROM company_narrative_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;