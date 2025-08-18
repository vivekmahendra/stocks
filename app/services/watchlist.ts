import { supabaseAdmin } from '../lib/supabase';
import type { WatchlistRow, WatchlistInsert, WatchlistUpdate, ActiveWatchlistRow } from '../types/database';

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
    // Get current max sort_order
    const { data: maxSortData } = await supabaseAdmin
      .from('watchlist')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = (maxSortData?.[0]?.sort_order || 0) + 1;

    const insertData: WatchlistInsert = {
      symbol: symbol.toUpperCase(),
      name,
      sort_order: nextSortOrder,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error adding ${symbol} to watchlist:`, error);
      return null;
    }

    console.log(`✅ Added ${symbol} to watchlist`);
    return data;
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