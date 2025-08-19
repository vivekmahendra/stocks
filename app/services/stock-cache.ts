import { supabaseAdmin } from '../lib/supabase';
import type { StockBarInsert, StockBarRow } from '../types/database';
import type { StockBar, StockData } from '../types/stock';
import { createAlpacaAPI } from '../lib/alpaca-api';
import { getMarketTime, getMostRecentTradingDay, isMarketOpen } from '../lib/market-time';

export class StockCacheService {
  /**
   * Fetch stock data with caching - checks database first, then fetches missing data from API
   */
  async fetchAndCacheStockData(
    symbols: string[],
    startDate: Date,
    endDate: Date,
    timeframe = '1Day',
    forceRefresh = false
  ): Promise<{ data: StockData[], loadedFromCache: boolean }> {
    console.log('📊 Stock Cache: Fetching data for', symbols);
    
    const results: StockData[] = [];
    const symbolsNeedingApiData: string[] = [];
    let loadedFromCache = true;
    
    // If force refresh, clear today's cached data first
    if (forceRefresh) {
      const today = new Date().toISOString().split('T')[0];
      console.log(`🔄 Force refresh enabled, clearing cache for ${today}`);
      
      for (const symbol of symbols) {
        const { error } = await supabaseAdmin
          .from('stock_bars')
          .delete()
          .eq('symbol', symbol)
          .eq('timeframe', timeframe)
          .gte('timestamp', today);
        
        if (error) {
          console.error(`Error clearing today's cache for ${symbol}:`, error);
        }
      }
    }
    
    // Step 1: Check what data we have in cache for each symbol
    for (const symbol of symbols) {
      if (forceRefresh) {
        console.log(`🔄 Force refresh enabled for ${symbol}, will fetch from API`);
        symbolsNeedingApiData.push(symbol);
        // Still get historical cached data for display while we fetch new data
        const cachedData = await this.getCachedData(symbol, startDate, endDate, timeframe);
        if (cachedData.length > 0) {
          results.push({
            symbol,
            bars: cachedData,
          });
        }
      } else {
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
            const firstBar = new Date(cachedData[0].t);
            const lastBar = new Date(cachedData[cachedData.length - 1].t);
            console.log(`⚠️ Incomplete data for ${symbol}:`);
            console.log(`   Requested: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
            console.log(`   Cached: ${firstBar.toISOString().split('T')[0]} to ${lastBar.toISOString().split('T')[0]}`);
            console.log(`   Will fetch missing data from API`);
            symbolsNeedingApiData.push(symbol);
          }
        } else {
          console.log(`❌ Cache miss for ${symbol}`);
          symbolsNeedingApiData.push(symbol);
        }
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
        const apiData = await alpacaAPI.getStockBars(symbolsNeedingApiData, timeframe, startDate, endDate);
        
        // Step 3: Cache the new data
        for (const stockData of apiData) {
          if (stockData.bars.length > 0) {
            const firstApiBar = new Date(stockData.bars[0].t);
            const lastApiBar = new Date(stockData.bars[stockData.bars.length - 1].t);
            console.log(`📥 API returned ${stockData.bars.length} bars for ${stockData.symbol}:`);
            console.log(`   Range: ${firstApiBar.toISOString().split('T')[0]} to ${lastApiBar.toISOString().split('T')[0]}`);
            
            await this.cacheStockBars(stockData.symbol, stockData.bars, timeframe);
            
            // Update or add to results
            const existingIndex = results.findIndex(r => r.symbol === stockData.symbol);
            if (existingIndex >= 0) {
              // Merge with existing cached data
              const mergedBars = this.mergeBars(results[existingIndex].bars, stockData.bars);
              console.log(`🔄 Merged ${results[existingIndex].bars.length} cached + ${stockData.bars.length} API = ${mergedBars.length} total bars`);
              results[existingIndex].bars = mergedBars;
            } else {
              results.push(stockData);
            }
          } else {
            console.log(`⚠️ API returned 0 bars for ${stockData.symbol}`);
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
    let totalInserted = 0;
    let totalBatches = Math.ceil(dbRecords.length / batchSize);
    
    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Inserting batch ${batchNum}/${totalBatches} (${batch.length} records) for ${symbol}`);
      
      const { data, error } = await supabaseAdmin
        .from('stock_bars')
        .upsert(batch, {
          onConflict: 'symbol,timestamp,timeframe',
          ignoreDuplicates: false,
        })
        .select('id');
      
      if (error) {
        console.error(`❌ Error caching batch ${batchNum}/${totalBatches} for ${symbol}:`, error);
        console.error(`   Batch date range: ${batch[0].timestamp} to ${batch[batch.length-1].timestamp}`);
      } else {
        totalInserted += batch.length;
        console.log(`✅ Successfully inserted batch ${batchNum}/${totalBatches} for ${symbol}`);
      }
    }
    
    console.log(`📊 Total insertion summary for ${symbol}: ${totalInserted}/${dbRecords.length} records`);
    
    // Verify what's actually in the database after insertion
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('stock_bars')
      .select('timestamp')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: true });
    
    if (!verifyError && verifyData) {
      const first = new Date(verifyData[0]?.timestamp).toISOString().split('T')[0];
      const last = new Date(verifyData[verifyData.length - 1]?.timestamp).toISOString().split('T')[0];
      console.log(`🔍 Database verification for ${symbol}: ${verifyData.length} total records (${first} to ${last})`);
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
    const now = new Date();
    
    // Use market time utilities for better accuracy
    const marketTime = getMarketTime();
    const mostRecentTradingDay = getMostRecentTradingDay();
    const marketIsOpen = isMarketOpen();
    
    // We need today's data if:
    // 1. Market is currently open, OR
    // 2. Market has closed today (after 4 PM on a trading day)
    const marketHour = marketTime.getHours();
    const needsTodayData = marketIsOpen || (marketHour >= 16 && mostRecentTradingDay.toDateString() === marketTime.toDateString());
    
    // For end date check:
    // - If we need today's data and last bar is not from today, data is incomplete
    // - Otherwise allow for weekends (up to 3 days for long weekends)
    if (needsTodayData) {
      const lastBarDate = lastBar.toISOString().split('T')[0];
      const todayDate = mostRecentTradingDay.toISOString().split('T')[0];
      
      // If we're requesting data up to today but don't have today's data, it's incomplete
      if (endDate.toISOString().split('T')[0] === todayDate && lastBarDate !== todayDate) {
        console.log(`📊 Cache incomplete for ${symbol}: Need trading day data (${todayDate}) but have up to ${lastBarDate}`);
        return false;
      }
    }
    
    // Allow for weekends and holidays - if we have data within 3 days of start/end, consider it complete
    const startDiff = Math.abs(firstBar.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const endDiff = Math.abs(lastBar.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // More strict for recent data, more lenient for historical data
    const maxEndDiff = needsTodayData ? 0 : 3; // If we need today's data, must be exact; otherwise allow 3 days
    
    return startDiff <= 5 && endDiff <= maxEndDiff;
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