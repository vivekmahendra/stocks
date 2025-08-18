-- Create watchlist table for managing tracked stock symbols
CREATE TABLE IF NOT EXISTS public.watchlist (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100),
    added_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON public.watchlist(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON public.watchlist(is_active);
CREATE INDEX IF NOT EXISTS idx_watchlist_sort_order ON public.watchlist(sort_order);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_watchlist_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_watchlist_updated_at
BEFORE UPDATE ON public.watchlist
FOR EACH ROW
EXECUTE FUNCTION update_watchlist_updated_at_column();

-- Grant permissions (adjust based on your needs)
-- For authenticated users to read
GRANT SELECT ON public.watchlist TO authenticated;

-- For service role to have full access
GRANT ALL ON public.watchlist TO service_role;

-- Allow service role to use the sequence
GRANT USAGE, SELECT ON SEQUENCE public.watchlist_id_seq TO service_role;

-- Insert current symbols from your dashboard
INSERT INTO public.watchlist (symbol, name, sort_order) VALUES
('SPY', 'SPDR S&P 500 ETF Trust', 1),
('TSLA', 'Tesla Inc', 2),
('AAPL', 'Apple Inc', 3),
('GOOG', 'Alphabet Inc Class C', 4),
('DIS', 'The Walt Disney Company', 5),
('LULU', 'Lululemon Athletica Inc', 6),
('UPS', 'United Parcel Service Inc', 7),
('UNH', 'UnitedHealth Group Inc', 8),
('AXP', 'American Express Company', 9)
ON CONFLICT (symbol) DO NOTHING;

-- View to see active watchlist symbols
CREATE OR REPLACE VIEW public.active_watchlist AS
SELECT 
    id,
    symbol,
    name,
    added_date,
    sort_order,
    created_at,
    updated_at
FROM public.watchlist 
WHERE is_active = TRUE 
ORDER BY sort_order ASC, added_date ASC;