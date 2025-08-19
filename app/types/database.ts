export interface Database {
  public: {
    Tables: {
      stock_bars: {
        Row: {
          id: number;
          symbol: string;
          timestamp: string;
          open_price: number;
          high_price: number;
          low_price: number;
          close_price: number;
          volume: number;
          timeframe: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          timestamp: string;
          open_price: number;
          high_price: number;
          low_price: number;
          close_price: number;
          volume: number;
          timeframe?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          timestamp?: string;
          open_price?: number;
          high_price?: number;
          low_price?: number;
          close_price?: number;
          volume?: number;
          timeframe?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      watchlist: {
        Row: {
          id: number;
          symbol: string;
          name: string | null;
          added_date: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          name?: string | null;
          added_date?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          name?: string | null;
          added_date?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticker_notes: {
        Row: {
          id: number;
          symbol: string;
          note_text: string;
          note_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          note_text: string;
          note_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          note_text?: string;
          note_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      active_watchlist: {
        Row: {
          id: number;
          symbol: string;
          name: string | null;
          added_date: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}

export type StockBarRow = Database['public']['Tables']['stock_bars']['Row'];
export type StockBarInsert = Database['public']['Tables']['stock_bars']['Insert'];
export type StockBarUpdate = Database['public']['Tables']['stock_bars']['Update'];

export type WatchlistRow = Database['public']['Tables']['watchlist']['Row'];
export type WatchlistInsert = Database['public']['Tables']['watchlist']['Insert'];
export type WatchlistUpdate = Database['public']['Tables']['watchlist']['Update'];
export type ActiveWatchlistRow = Database['public']['Views']['active_watchlist']['Row'];

export type TickerNoteRow = Database['public']['Tables']['ticker_notes']['Row'];
export type TickerNoteInsert = Database['public']['Tables']['ticker_notes']['Insert'];
export type TickerNoteUpdate = Database['public']['Tables']['ticker_notes']['Update'];