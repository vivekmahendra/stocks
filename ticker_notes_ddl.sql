-- Ticker Notes Table
-- Store user notes and thoughts about individual tickers

CREATE TABLE IF NOT EXISTS ticker_notes (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  note_text TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticker_notes_symbol ON ticker_notes(symbol);
CREATE INDEX IF NOT EXISTS idx_ticker_notes_created_at ON ticker_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticker_notes_type ON ticker_notes(note_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticker_notes_updated_at
  BEFORE UPDATE ON ticker_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add some sample note types as comments for reference
COMMENT ON COLUMN ticker_notes.note_type IS 'Types: general, analysis, trade_idea, research, earnings, news, technical, fundamental';

-- Add constraint to ensure symbol is uppercase
ALTER TABLE ticker_notes ADD CONSTRAINT ticker_notes_symbol_uppercase CHECK (symbol = UPPER(symbol));