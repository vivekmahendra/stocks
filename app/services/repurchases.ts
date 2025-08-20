import { createClient } from '@supabase/supabase-js';

export interface RepurchaseData {
  symbol: string;
  date: string;
  period: string;
  fiscal_year: number;
  common_stock_repurchased: number;
}

class RepurchaseService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getRepurchaseData(symbol: string): Promise<RepurchaseData[]> {
    const { data, error } = await this.supabase
      .from('common_stock_repurchases')
      .select('symbol, date, period, fiscal_year, common_stock_repurchased')
      .eq('symbol', symbol)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching repurchase data:', error);
      return [];
    }

    return data || [];
  }

  async getRecentRepurchases(symbol: string, limit: number = 20): Promise<RepurchaseData[]> {
    const { data, error } = await this.supabase
      .from('common_stock_repurchases')
      .select('symbol, date, period, fiscal_year, common_stock_repurchased')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent repurchase data:', error);
      return [];
    }

    return (data || []).reverse(); // Reverse to get chronological order
  }
}

export const repurchaseService = new RepurchaseService();