-- Create stock_bars table for caching historical stock data
CREATE TABLE IF NOT EXISTS public.stock_bars (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open_price DECIMAL(10, 2) NOT NULL,
    high_price DECIMAL(10, 2) NOT NULL,
    low_price DECIMAL(10, 2) NOT NULL,
    close_price DECIMAL(10, 2) NOT NULL,
    volume BIGINT NOT NULL,
    timeframe VARCHAR(20) DEFAULT '1Day',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate entries
ALTER TABLE public.stock_bars
ADD CONSTRAINT stock_bars_unique_constraint 
UNIQUE (symbol, timestamp, timeframe);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_bars_symbol ON public.stock_bars(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_bars_timestamp ON public.stock_bars(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_bars_symbol_timestamp ON public.stock_bars(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_bars_symbol_timeframe ON public.stock_bars(symbol, timeframe);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_stock_bars_updated_at
BEFORE UPDATE ON public.stock_bars
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust based on your needs)
-- For authenticated users to read
GRANT SELECT ON public.stock_bars TO authenticated;

-- For service role to have full access
GRANT ALL ON public.stock_bars TO service_role;

-- Allow service role to use the sequence
GRANT USAGE, SELECT ON SEQUENCE public.stock_bars_id_seq TO service_role;