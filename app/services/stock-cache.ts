import { supabaseAdmin } from '../lib/supabase';
import type { StockBarInsert, StockBarRow } from '../types/database';
import type { StockBar, StockData } from '../types/stock';
import { createAlpacaAPI } from '../lib/alpaca-api';

export class StockCacheService {
  /**
   * Fetch stock data with caching - checks database first, then fetches missing data from API
   */
  async fetchAndCacheStockData(
    symbols: string[],
    startDate: Date,
    endDate: Date,
    timeframe = '1Day'
  ): Promise<{ data: StockData[], loadedFromCache: boolean }> {
    console.log('📊 Stock Cache: Fetching data for', symbols);
    
    const results: StockData[] = [];
    const symbolsNeedingApiData: string[] = [];
    let loadedFromCache = true;
    
    // Step 1: Check what data we have in cache for each symbol
    for (const symbol of symbols) {
      const cachedData = await this.getCachedData(symbol, startDate, endDate, timeframe);
      
      if (cachedData.length > 0) {
        console.log(`✅ Cache hit for ${symbol}: ${cachedData.length} bars`);
        results.push({
          symbol,
          bars: cachedData,
        });
        
        // Check if we have complete data for the date range
        const hasCompleteData = await this.hasCompleteDataRange(
          symbol,
          startDate,
          endDate,
          cachedData,
          timeframe
        );
        
        if (!hasCompleteData) {
          console.log(`⚠️ Incomplete data for ${symbol}, will fetch missing data`);
          symbolsNeedingApiData.push(symbol);
        }
      } else {
        console.log(`❌ Cache miss for ${symbol}`);
        symbolsNeedingApiData.push(symbol);
      }
    }
    
    // Step 2: Fetch missing data from Alpaca API
    if (symbolsNeedingApiData.length > 0) {
      console.log('🔄 Fetching from Alpaca API:', symbolsNeedingApiData);
      loadedFromCache = false; // We're hitting the API, so not fully from cache
      
      const apiKey = process.env.ALPACA_API_KEY!;
      const secretKey = process.env.ALPACA_SECRET_KEY!;
      const alpacaAPI = createAlpacaAPI(apiKey, secretKey);
      
      try {
        const apiData = await alpacaAPI.getStockBars(symbolsNeedingApiData, timeframe);
        
        // Step 3: Cache the new data
        for (const stockData of apiData) {
          if (stockData.bars.length > 0) {
            await this.cacheStockBars(stockData.symbol, stockData.bars, timeframe);
            
            // Update or add to results
            const existingIndex = results.findIndex(r => r.symbol === stockData.symbol);
            if (existingIndex >= 0) {
              // Merge with existing cached data
              const mergedBars = this.mergeBars(results[existingIndex].bars, stockData.bars);
              results[existingIndex].bars = mergedBars;
            } else {
              results.push(stockData);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching from Alpaca API:', error);
        // Return whatever cached data we have
      }
    }
    
    // Sort results by symbol for consistency
    results.sort((a, b) => a.symbol.localeCompare(b.symbol));
    
    // Log cache statistics
    const totalCachedBars = results.reduce((sum, r) => sum + r.bars.length, 0);
    console.log(`📊 Cache Statistics: ${results.length} symbols, ${totalCachedBars} total bars, loaded from ${loadedFromCache ? 'CACHE' : 'API'}`);
    
    return { data: results, loadedFromCache };
  }
  
  /**
   * Get cached data from Supabase
   */
  private async getCachedData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    timeframe: string
  ): Promise<StockBar[]> {
    const { data, error } = await supabaseAdmin
      .from('stock_bars')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error(`Error fetching cached data for ${symbol}:`, error);
      return [];
    }
    
    // Convert database rows to StockBar format
    return (data || []).map(row => ({
      t: row.timestamp,
      o: Number(row.open_price),
      h: Number(row.high_price),
      l: Number(row.low_price),
      c: Number(row.close_price),
      v: Number(row.volume),
    }));
  }
  
  /**
   * Cache stock bars in Supabase
   */
  private async cacheStockBars(
    symbol: string,
    bars: StockBar[],
    timeframe: string
  ): Promise<void> {
    if (bars.length === 0) return;
    
    console.log(`💾 Caching ${bars.length} bars for ${symbol}`);
    
    // Convert StockBar to database format
    const dbRecords: StockBarInsert[] = bars.map(bar => ({
      symbol,
      timestamp: bar.t,
      open_price: bar.o,
      high_price: bar.h,
      low_price: bar.l,
      close_price: bar.c,
      volume: bar.v,
      timeframe,
    }));
    
    // Batch insert with upsert to handle duplicates
    const batchSize = 500;
    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);
      
      const { error } = await supabaseAdmin
        .from('stock_bars')
        .upsert(batch, {
          onConflict: 'symbol,timestamp,timeframe',
          ignoreDuplicates: false,
        });
      
      if (error) {
        console.error(`Error caching batch for ${symbol}:`, error);
      }
    }
    
    console.log(`✅ Successfully cached ${bars.length} bars for ${symbol}`);
  }
  
  /**
   * Check if we have complete data for the date range
   */
  private async hasCompleteDataRange(
    symbol: string,
    startDate: Date,
    endDate: Date,
    cachedData: StockBar[],
    timeframe: string
  ): Promise<boolean> {
    // Simple check: if we have data and the date range matches, consider it complete
    // In production, you might want more sophisticated gap detection
    if (cachedData.length === 0) return false;
    
    const firstBar = new Date(cachedData[0].t);
    const lastBar = new Date(cachedData[cachedData.length - 1].t);
    
    // Allow for weekends and holidays - if we have data within 5 days of start/end, consider it complete
    const startDiff = Math.abs(firstBar.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const endDiff = Math.abs(lastBar.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return startDiff <= 5 && endDiff <= 5;
  }
  
  /**
   * Merge and deduplicate bars
   */
  private mergeBars(existingBars: StockBar[], newBars: StockBar[]): StockBar[] {
    const barMap = new Map<string, StockBar>();
    
    // Add existing bars
    existingBars.forEach(bar => {
      barMap.set(bar.t, bar);
    });
    
    // Add/update with new bars
    newBars.forEach(bar => {
      barMap.set(bar.t, bar);
    });
    
    // Convert back to array and sort
    return Array.from(barMap.values()).sort((a, b) => 
      new Date(a.t).getTime() - new Date(b.t).getTime()
    );
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalRecords: number;
    symbols: string[];
    dateRange: { min: string; max: string };
  }> {
    const { count, error: countError } = await supabaseAdmin
      .from('stock_bars')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count:', countError);
    }
    
    const { data: symbolsData } = await supabaseAdmin
      .from('stock_bars')
      .select('symbol')
      .order('symbol');
    
    const { data: dateData } = await supabaseAdmin
      .from('stock_bars')
      .select('timestamp')
      .order('timestamp', { ascending: true })
      .limit(1);
    
    const { data: maxDateData } = await supabaseAdmin
      .from('stock_bars')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1);
    
    const uniqueSymbols = [...new Set((symbolsData || []).map(d => d.symbol))];
    
    return {
      totalRecords: count || 0,
      symbols: uniqueSymbols,
      dateRange: {
        min: dateData?.[0]?.timestamp || '',
        max: maxDateData?.[0]?.timestamp || '',
      },
    };
  }
  
  /**
   * Clear cache for specific symbols or all
   */
  async clearCache(symbols?: string[]): Promise<void> {
    if (symbols && symbols.length > 0) {
      const { error } = await supabaseAdmin
        .from('stock_bars')
        .delete()
        .in('symbol', symbols);
      
      if (error) {
        console.error('Error clearing cache:', error);
      } else {
        console.log(`🗑️ Cleared cache for symbols: ${symbols.join(', ')}`);
      }
    } else {
      const { error } = await supabaseAdmin
        .from('stock_bars')
        .delete()
        .gte('id', 0); // Delete all
      
      if (error) {
        console.error('Error clearing all cache:', error);
      } else {
        console.log('🗑️ Cleared entire cache');
      }
    }
  }
}

// Export singleton instance
export const stockCacheService = new StockCacheService();