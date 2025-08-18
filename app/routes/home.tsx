import type { Route } from "./+types/home";
import { useLoaderData, redirect } from "react-router";
import { StockChart } from "../components/stock-chart";
import { AddTicker } from "../components/add-ticker";
import { stockCacheService } from "../services/stock-cache";
import { watchlistService } from "../services/watchlist";
import type { StockData } from "../types/stock";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stock Dashboard" },
    { name: "description", content: "Real-time stock dashboard powered by Alpaca" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action");
  
  if (actionType === "add-ticker") {
    const symbol = formData.get("symbol")?.toString()?.toUpperCase().trim();
    const name = formData.get("name")?.toString()?.trim();
    
    if (!symbol) {
      return { error: "Symbol is required" };
    }
    
    try {
      console.log(`🔄 Adding ticker ${symbol} to watchlist`);
      
      const result = await watchlistService.addSymbol(symbol, name || undefined);
      
      if (result) {
        console.log(`✅ Successfully added ${symbol} to watchlist`);
        return redirect("/"); // Redirect to refresh the page with new ticker
      } else {
        return { error: `Failed to add ${symbol} to watchlist` };
      }
    } catch (error) {
      console.error(`❌ Error adding ${symbol}:`, error);
      return { error: error instanceof Error ? error.message : `Failed to add ${symbol}` };
    }
  }
  
  return { error: "Unknown action" };
}

export async function loader() {
  console.log('🔄 Home loader starting with watchlist and cache...');
  
  const loadStartTime = Date.now();
  
  // Get symbols from watchlist
  const symbols = await watchlistService.getActiveSymbols();
  
  // Get full watchlist details for added dates
  const watchlistDetails = await watchlistService.getWatchlist();
  
  try {
    // Check environment variables
    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    console.log('🔑 Environment check:', {
      hasAlpacaKeys: !!(apiKey && secretKey),
      hasSupabaseKeys: !!(supabaseUrl && supabaseKey),
    });

    if (!apiKey || !secretKey) {
      console.error('❌ Missing API credentials');
      return {
        stocksData: [],
        watchlistDetails: [],
        error: 'Missing Alpaca API credentials. Please check your .env file.',
        cacheStats: null,
        watchlistStats: null,
        loadSource: null,
        loadTime: null,
      };
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        stocksData: [],
        watchlistDetails: [],
        error: 'Missing Supabase credentials. Please check your .env file.',
        cacheStats: null,
        watchlistStats: null,
        loadSource: null,
        loadTime: null,
      };
    }

    // Calculate date range (past 3 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    // Fetch data using cache service (checks cache first, then API)
    const result = await stockCacheService.fetchAndCacheStockData(
      symbols,
      startDate,
      endDate,
      '1Day'
    );
    
    // Get cache statistics after loading
    const cacheStats = await stockCacheService.getCacheStats();
    
    // Get watchlist stats
    const watchlistStats = await watchlistService.getStats();
    
    // Determine load source from the service response
    const loadSource = result.loadedFromCache ? 'cache' : 'api';
    
    const loadTime = Date.now() - loadStartTime;
    
    console.log('✅ Successfully loaded stock data:', {
      symbols: result.data.map(s => s.symbol),
      totalBars: result.data.reduce((sum, stock) => sum + stock.bars.length, 0),
      cacheStats,
      watchlistStats,
      loadSource,
      loadTime: `${loadTime}ms`,
    });

    return { 
      stocksData: result.data, 
      watchlistDetails,
      error: null, 
      cacheStats, 
      watchlistStats,
      loadSource, 
      loadTime 
    };
  } catch (error) {
    console.error('❌ Loader error:', error);
    return {
      stocksData: [],
      watchlistDetails: [],
      error: error instanceof Error ? error.message : 'Failed to fetch stock data',
      cacheStats: null,
      watchlistStats: null,
      loadSource: null,
      loadTime: null,
    };
  }
}

export default function Home() {
  const { stocksData, watchlistDetails, error, cacheStats, watchlistStats, loadSource, loadTime } = useLoaderData<typeof loader>();
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-xl text-red-600 mb-4">Error: {error}</p>
          <p className="text-gray-600 text-sm">
            Check the server console for more details.
          </p>
        </div>
      </div>
    );
  }

  if (!stocksData || stocksData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">No stock data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900 text-center sm:text-left">
            Stock Dashboard
          </h1>
          <div className="mt-4 sm:mt-0">
            <AddTicker />
          </div>
        </div>
        
        {/* Data Source and Cache Stats */}
        <div className="text-center mb-6 space-y-1">
          {loadSource && (
            <div className="flex items-center justify-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                loadSource === 'cache' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {loadSource === 'cache' ? '⚡ Loaded from Cache' : '🌐 Loaded from API'}
              </span>
              {loadTime && (
                <span className="text-xs text-gray-500">
                  {loadTime}ms
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-600">
            {cacheStats && (
              <span>
                📊 Cache: {cacheStats.totalRecords.toLocaleString()} records
              </span>
            )}
            {watchlistStats && (
              <span>
                📋 Watchlist: {watchlistStats.activeSymbols} active symbols
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {stocksData.map((stock, index) => {
            // Find watchlist entry for this symbol
            const watchlistEntry = watchlistDetails.find(w => w.symbol === stock.symbol);
            
            return (
              <StockChart
                key={stock.symbol}
                stockData={stock}
                watchlistEntry={watchlistEntry}
                color={colors[index % colors.length]}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
