export interface StockBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

export interface AlpacaResponse {
  bars: Record<string, StockBar[]>;
  next_page_token: string | null;
}

export interface StockData {
  symbol: string;
  bars: StockBar[];
}