import { supabaseAdmin } from '../lib/supabase';
import type { WatchlistRow, WatchlistInsert, WatchlistUpdate, ActiveWatchlistRow } from '../types/database';
import { createAlpacaAPI } from '../lib/alpaca-api';

export class WatchlistService {
  /**
   * Get all active watchlist symbols ordered by sort_order then added_date
   */
  async getActiveSymbols(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('active_watchlist')
      .select('symbol')
      .order('sort_order', { ascending: true })
      .order('added_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching watchlist symbols:', error);
      // Fallback to original symbols if database fails
      return ['SPY', 'TSLA', 'AAPL', 'GOOG', 'DIS', 'LULU', 'UPS', 'UNH', 'AXP'];
    }

    const symbols = (data || []).map(item => item.symbol);
    console.log('📋 Loaded watchlist symbols:', symbols);
    
    return symbols;
  }

  /**
   * Get full watchlist details
   */
  async getWatchlist(): Promise<ActiveWatchlistRow[]> {
    const { data, error } = await supabaseAdmin
      .from('active_watchlist')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('added_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching watchlist:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Add a new symbol to the watchlist
   */
  async addSymbol(symbol: string, name?: string): Promise<WatchlistRow | null> {
    const upperSymbol = symbol.toUpperCase();
    
    // Try to fetch current price
    let currentPrice: number | null = null;
    try {
      const apiKey = process.env.ALPACA_API_KEY;
      const secretKey = process.env.ALPACA_SECRET_KEY;
      
      if (apiKey && secretKey) {
        const alpacaAPI = createAlpacaAPI(apiKey, secretKey);
        // Get just 1 day of data to get the latest price
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 5); // Go back 5 days to ensure we get data
        
        const stockData = await alpacaAPI.getStockBars([upperSymbol], '1Day', startDate, endDate, 5);
        
        if (stockData.length > 0 && stockData[0].bars.length > 0) {
          // Get the most recent closing price
          const bars = stockData[0].bars.sort((a, b) => 
            new Date(b.t).getTime() - new Date(a.t).getTime()
          );
          currentPrice = bars[0].c;
          console.log(`💰 Current price for ${upperSymbol}: $${currentPrice}`);
        }
      }
    } catch (error) {
      console.error(`⚠️ Could not fetch current price for ${upperSymbol}:`, error);
      // Continue without price - not critical
    }
    
    // First, check if the symbol already exists (including inactive ones)
    const { data: existingData } = await supabaseAdmin
      .from('watchlist')
      .select('*')
      .eq('symbol', upperSymbol)
      .single();

    if (existingData) {
      // Symbol exists, reactivate it and update price
      const { data, error } = await supabaseAdmin
        .from('watchlist')
        .update({ 
          is_active: true,
          name: name || existingData.name, // Update name if provided, keep existing otherwise
          price_at_addition: currentPrice || existingData.price_at_addition, // Update price if we got it
          updated_at: new Date().toISOString()
        })
        .eq('symbol', upperSymbol)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error reactivating ${upperSymbol} in watchlist:`, error);
        return null;
      }

      console.log(`✅ Reactivated ${upperSymbol} in watchlist with price: $${currentPrice || 'unknown'}`);
      return data;
    } else {
      // Symbol doesn't exist, create new entry
      // Get current max sort_order
      const { data: maxSortData } = await supabaseAdmin
        .from('watchlist')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = (maxSortData?.[0]?.sort_order || 0) + 1;

      const insertData: WatchlistInsert = {
        symbol: upperSymbol,
        name,
        sort_order: nextSortOrder,
        is_active: true,
        price_at_addition: currentPrice,
      };

      const { data, error } = await supabaseAdmin
        .from('watchlist')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error adding ${upperSymbol} to watchlist:`, error);
        return null;
      }

      console.log(`✅ Added ${upperSymbol} to watchlist with price: $${currentPrice || 'unknown'}`);
      return data;
    }
  }

  /**
   * Remove a symbol from the watchlist (set inactive)
   */
  async removeSymbol(symbol: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .update({ is_active: false })
      .eq('symbol', symbol.toUpperCase());

    if (error) {
      console.error(`❌ Error removing ${symbol} from watchlist:`, error);
      return false;
    }

    console.log(`🗑️ Removed ${symbol} from watchlist`);
    return true;
  }

  /**
   * Update symbol details
   */
  async updateSymbol(symbol: string, updates: WatchlistUpdate): Promise<WatchlistRow | null> {
    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .update(updates)
      .eq('symbol', symbol.toUpperCase())
      .select()
      .single();

    if (error) {
      console.error(`❌ Error updating ${symbol}:`, error);
      return null;
    }

    console.log(`✅ Updated ${symbol} in watchlist`);
    return data;
  }

  /**
   * Reorder watchlist symbols
   */
  async reorderSymbols(symbolsInOrder: string[]): Promise<boolean> {
    try {
      const updates = symbolsInOrder.map((symbol, index) => ({
        symbol: symbol.toUpperCase(),
        sort_order: index + 1,
      }));

      for (const update of updates) {
        await supabaseAdmin
          .from('watchlist')
          .update({ sort_order: update.sort_order })
          .eq('symbol', update.symbol);
      }

      console.log('✅ Reordered watchlist symbols');
      return true;
    } catch (error) {
      console.error('❌ Error reordering watchlist:', error);
      return false;
    }
  }

  /**
   * Get watchlist statistics
   */
  async getStats(): Promise<{
    totalSymbols: number;
    activeSymbols: number;
    oldestAdded: string | null;
    newestAdded: string | null;
  }> {
    const { data: allData } = await supabaseAdmin
      .from('watchlist')
      .select('is_active, added_date')
      .order('added_date', { ascending: true });

    if (!allData || allData.length === 0) {
      return {
        totalSymbols: 0,
        activeSymbols: 0,
        oldestAdded: null,
        newestAdded: null,
      };
    }

    const activeSymbols = allData.filter(item => item.is_active).length;
    const oldest = allData[0]?.added_date;
    const newest = allData[allData.length - 1]?.added_date;

    return {
      totalSymbols: allData.length,
      activeSymbols,
      oldestAdded: oldest || null,
      newestAdded: newest || null,
    };
  }
}

// Export singleton instance
export const watchlistService = new WatchlistService();