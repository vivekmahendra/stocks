import { createClient } from '@supabase/supabase-js';

export interface FinancialRatios {
  id: number;
  symbol: string;
  date: string;
  fiscal_year: number;
  period: string;
  reported_currency: string;
  
  // Key ratios we're targeting
  book_value_per_share: number | null;
  price_to_book_ratio: number | null;
  
  // Additional important ratios
  price_to_earnings_ratio: number | null;
  price_to_sales_ratio: number | null;
  net_profit_margin: number | null;
  gross_profit_margin: number | null;
  operating_profit_margin: number | null;
  debt_to_equity_ratio: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  
  // Per share metrics
  revenue_per_share: number | null;
  net_income_per_share: number | null;
  cash_per_share: number | null;
  free_cash_flow_per_share: number | null;
  
  // Metadata
  source: string;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

class FinancialRatiosService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getAllRatios(symbol: string): Promise<FinancialRatios[]> {
    const { data, error } = await this.supabase
      .from('financial_ratios')
      .select('*')
      .eq('symbol', symbol)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching financial ratios:', error);
      return [];
    }

    return data || [];
  }

  async getRecentRatios(symbol: string, limit: number = 20): Promise<FinancialRatios[]> {
    const { data, error } = await this.supabase
      .from('financial_ratios')
      .select('*')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent financial ratios:', error);
      return [];
    }

    return (data || []).reverse(); // Reverse to get chronological order
  }

  async getRatiosInDateRange(
    symbol: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<FinancialRatios[]> {
    const { data, error } = await this.supabase
      .from('financial_ratios')
      .select('*')
      .eq('symbol', symbol)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching ratios in date range:', error);
      return [];
    }

    return data || [];
  }

  async getLatestRatios(symbol: string): Promise<FinancialRatios | null> {
    const { data, error } = await this.supabase
      .from('financial_ratios')
      .select('*')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest ratios:', error);
      return null;
    }

    return data?.[0] || null;
  }

  async getBookValueHistory(symbol: string, limit?: number): Promise<Array<{
    date: string;
    period: string;
    fiscal_year: number;
    book_value_per_share: number;
  }>> {
    const query = this.supabase
      .from('financial_ratios')
      .select('date, period, fiscal_year, book_value_per_share')
      .eq('symbol', symbol)
      .not('book_value_per_share', 'is', null)
      .order('date', { ascending: true });

    if (limit) {
      query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching book value history:', error);
      return [];
    }

    return (data || []).filter(item => item.book_value_per_share !== null);
  }

  async getPriceToBookHistory(symbol: string, limit?: number): Promise<Array<{
    date: string;
    period: string;
    fiscal_year: number;
    price_to_book_ratio: number;
  }>> {
    const query = this.supabase
      .from('financial_ratios')
      .select('date, period, fiscal_year, price_to_book_ratio')
      .eq('symbol', symbol)
      .not('price_to_book_ratio', 'is', null)
      .order('date', { ascending: true });

    if (limit) {
      query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching price to book history:', error);
      return [];
    }

    return (data || []).filter(item => item.price_to_book_ratio !== null);
  }

  // Helper method to get key ratios for display
  async getKeyRatiosSummary(symbol: string): Promise<{
    latest: FinancialRatios | null;
    bookValueHistory: Array<{ date: string; value: number }>;
    priceToBookHistory: Array<{ date: string; value: number }>;
  }> {
    const [latest, bvpsHistory, pbHistory] = await Promise.all([
      this.getLatestRatios(symbol),
      this.getBookValueHistory(symbol, 20),
      this.getPriceToBookHistory(symbol, 20)
    ]);

    return {
      latest,
      bookValueHistory: bvpsHistory.map(item => ({
        date: item.date,
        value: item.book_value_per_share
      })),
      priceToBookHistory: pbHistory.map(item => ({
        date: item.date,
        value: item.price_to_book_ratio
      }))
    };
  }
}

export const financialRatiosService = new FinancialRatiosService();