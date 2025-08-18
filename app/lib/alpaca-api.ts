import type { AlpacaResponse, StockData } from '../types/stock';

const ALPACA_DATA_URL = 'https://data.alpaca.markets/v2/stocks/bars';

export class AlpacaAPI {
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  async getStockBars(symbols: string[], timeframe = '1Day', limit = 90): Promise<StockData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Past quarter

    // Try getting all symbols in one request first with pagination
    let allData: Record<string, any[]> = {};
    let hasMoreData = true;
    let pageToken: string | null = null;
    let totalPages = 0;
    const maxPages = 3; // Limit to prevent infinite loops

    while (hasMoreData && totalPages < maxPages) {
      const params = new URLSearchParams({
        symbols: symbols.join(','),
        timeframe,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        feed: 'iex',
        limit: limit.toString(),
      });

      if (pageToken) {
        params.set('page_token', pageToken);
      }

      const url = `${ALPACA_DATA_URL}?${params}`;
      console.log(`🚀 Alpaca API Request (batch, page ${totalPages + 1}):`, {
        url,
        symbols,
        timeframe,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        pageToken,
      });

      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Alpaca API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Failed to fetch stock data: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: AlpacaResponse = await response.json();
      totalPages++;

      // Merge data from this page
      if (data.bars) {
        Object.keys(data.bars).forEach(symbol => {
          if (!allData[symbol]) {
            allData[symbol] = [];
          }
          allData[symbol] = [...allData[symbol], ...data.bars[symbol]];
        });
      }

      pageToken = data.next_page_token;
      hasMoreData = !!pageToken;

      console.log(`📊 Page ${totalPages} results:`, {
        returnedSymbols: Object.keys(data.bars || {}),
        barsThisPage: Object.values(data.bars || {}).reduce((sum, bars) => sum + bars.length, 0),
        nextPageToken: data.next_page_token ? 'exists' : 'none',
      });
    }

    const returnedSymbols = Object.keys(allData);
    console.log('📊 Batch pagination complete:', {
      totalPages,
      requestedSymbols: symbols,
      returnedSymbols,
      totalBars: Object.values(allData).reduce((sum, bars) => sum + bars.length, 0),
    });
    
    // If we didn't get all symbols, try individual requests for missing ones
    const missingSymbols = symbols.filter(symbol => !returnedSymbols.includes(symbol));
    if (missingSymbols.length > 0) {
      console.log('🔄 Missing symbols, trying individual requests:', missingSymbols);
      
      for (const symbol of missingSymbols) {
        try {
          const individualResult = await this.getSingleStockBars(symbol, timeframe, limit);
          if (individualResult.bars.length > 0) {
            allData[symbol] = individualResult.bars;
          }
        } catch (error) {
          console.error(`❌ Failed to fetch ${symbol} individually:`, error);
        }
      }
    }
    
    return symbols.map(symbol => ({
      symbol,
      bars: allData[symbol] || [],
    }));
  }

  private async getSingleStockBars(symbol: string, timeframe = '1Day', limit = 90) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    let allBars: any[] = [];
    let hasMoreData = true;
    let pageToken: string | null = null;
    let totalPages = 0;
    const maxPages = 3; // Limit to prevent infinite loops

    while (hasMoreData && totalPages < maxPages) {
      const params = new URLSearchParams({
        symbols: symbol,
        timeframe,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        feed: 'iex',
        limit: limit.toString(),
      });

      if (pageToken) {
        params.set('page_token', pageToken);
      }

      const url = `${ALPACA_DATA_URL}?${params}`;
      console.log(`🚀 Individual request for ${symbol} (page ${totalPages + 1}):`, url);

      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${symbol}: ${response.statusText}`);
      }

      const data: AlpacaResponse = await response.json();
      totalPages++;

      if (data.bars && data.bars[symbol]) {
        allBars = [...allBars, ...data.bars[symbol]];
      }

      pageToken = data.next_page_token;
      hasMoreData = !!pageToken;

      console.log(`📊 Individual page ${totalPages} for ${symbol}:`, {
        barsThisPage: data.bars?.[symbol]?.length || 0,
        totalBars: allBars.length,
        nextPageToken: data.next_page_token ? 'exists' : 'none',
      });
    }

    console.log(`📊 Individual pagination complete for ${symbol}:`, {
      totalPages,
      totalBars: allBars.length,
    });

    return {
      symbol,
      bars: allBars,
    };
  }
}

export function createAlpacaAPI(apiKey: string, secretKey: string) {
  return new AlpacaAPI(apiKey, secretKey);
}