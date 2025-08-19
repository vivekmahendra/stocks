-- Add price_at_addition column to watchlist table
ALTER TABLE watchlist 
ADD COLUMN price_at_addition DECIMAL(10, 2);

-- Create or replace the active_watchlist view to include the new column
CREATE OR REPLACE VIEW active_watchlist AS
SELECT 
  id,
  symbol,
  name,
  added_date,
  sort_order,
  created_at,
  updated_at,
  price_at_addition
FROM watchlist
WHERE is_active = true;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN watchlist.price_at_addition IS 'The stock price when it was added to the watchlist';