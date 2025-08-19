import type { Route } from "./+types/home";
import { useLoaderData, useActionData, redirect, useNavigation } from "react-router";
import { StockChart } from "../components/stock-chart";
import { AddTicker } from "../components/add-ticker";
import { TimeRangeSelector, getDateRangeFromParam } from "../components/time-range-selector";
import { Layout } from "../components/layout";
import { AccountOverview } from "../components/account-overview";
import { OpenOrders } from "../components/open-orders";
import { Positions } from "../components/positions";
import { stockCacheService } from "../services/stock-cache";
import { watchlistService } from "../services/watchlist";
import { getLogoService } from "../services/logo";
import { createAccountService } from "../services/account";
import { createGrokService, MARKET_SUMMARY_PROMPT } from "../services/grok";
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
  
  if (actionType === "delete-ticker") {
    const symbol = formData.get("symbol")?.toString()?.toUpperCase().trim();
    
    if (!symbol) {
      return { error: "Symbol is required" };
    }
    
    try {
      console.log(`🔄 Removing ticker ${symbol} from watchlist`);
      
      const result = await watchlistService.removeSymbol(symbol);
      
      if (result) {
        console.log(`✅ Successfully removed ${symbol} from watchlist`);
        return redirect("/"); // Redirect to refresh the page
      } else {
        return { error: `Failed to remove ${symbol} from watchlist` };
      }
    } catch (error) {
      console.error(`❌ Error removing ${symbol}:`, error);
      return { error: error instanceof Error ? error.message : `Failed to remove ${symbol}` };
    }
  }
  
  return { error: "Unknown action" };
}

export async function loader({ request }: Route.LoaderArgs) {
  console.log('🔄 Home loader starting with watchlist and cache...');
  
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  
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
    const xaiApiKey = process.env.XAI_API_KEY;
    
    console.log('🔑 Environment check:', {
      hasAlpacaKeys: !!(apiKey && secretKey),
      hasSupabaseKeys: !!(supabaseUrl && supabaseKey),
      hasXAIKey: !!xaiApiKey,
      xaiKeyLength: xaiApiKey ? xaiApiKey.length : 0
    });

    if (!apiKey || !secretKey) {
      console.error('❌ Missing API credentials');
      return {
        stocksData: [],
        watchlistDetails: [],
        logos: {} as Record<string, string | null>,
        accountSummary: null,
        marketSummary: null,
        error: 'Missing Alpaca API credentials. Please check your .env file.',
        cacheStats: null,
        watchlistStats: null,
        loadSource: null,
        loadTime: null,
        dateRange: null,
      };
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        stocksData: [],
        watchlistDetails: [],
        logos: {} as Record<string, string | null>,
        accountSummary: null,
        marketSummary: null,
        error: 'Missing Supabase credentials. Please check your .env file.',
        cacheStats: null,
        watchlistStats: null,
        loadSource: null,
        loadTime: null,
        dateRange: null,
      };
    }

    // Calculate date range based on URL parameter
    const { startDate, endDate } = getDateRangeFromParam(rangeParam);
    
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
    
    // Fetch company logos
    const logoService = getLogoService();
    const logos: Record<string, string | null> = logoService ? await logoService.getLogos(symbols) : {};
    
    // Fetch account data
    let accountSummary = null;
    try {
      const accountService = createAccountService(apiKey, secretKey, true); // Use paper trading
      accountSummary = await accountService.getAccountSummary();
      console.log('✅ Account data loaded successfully');
    } catch (error) {
      console.error('⚠️ Could not load account data (continuing without):', error);
      // Continue without account data - this is not critical for basic functionality
    }
    
    // Fetch market summary from Grok
    let marketSummary = null;
    try {
      console.log('🔄 Attempting to create Grok service...');
      const grokService = createGrokService();
      if (grokService) {
        console.log('🔄 Grok service created, fetching market summary...');
        marketSummary = await grokService.getMarketSummary();
        console.log('✅ Market summary loaded successfully:', marketSummary?.substring(0, 50) + '...');
      } else {
        console.log('⚠️ Grok service not created - check XAI_API_KEY');
      }
    } catch (error) {
      console.error('⚠️ Could not load market summary:', error);
      // Continue without market summary - this is not critical
    }
    
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
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      logosFound: Object.keys(logos).filter(symbol => logos[symbol]).length,
    });

    return { 
      stocksData: result.data, 
      watchlistDetails,
      logos,
      accountSummary,
      marketSummary,
      error: null, 
      cacheStats, 
      watchlistStats,
      loadSource, 
      loadTime,
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    console.error('❌ Loader error:', error);
    return {
      stocksData: [],
      watchlistDetails: [],
      logos: {},
      accountSummary: null,
      marketSummary: null,
      error: error instanceof Error ? error.message : 'Failed to fetch stock data',
      cacheStats: null,
      watchlistStats: null,
      loadSource: null,
      loadTime: null,
      dateRange: null,
    };
  }
}

export default function Home() {
  const { stocksData, watchlistDetails, logos, accountSummary, marketSummary, error, cacheStats, watchlistStats, loadSource, loadTime, dateRange } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

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
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {actionData?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {actionData.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Market Summary from Grok */}
        <div className="mb-6">
          {navigation.state === "loading" && !marketSummary ? (
            // Loading skeleton
            <div className="rounded-lg p-4 border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 bg-blue-300 rounded"></div>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-blue-200 rounded w-24 mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-300 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : marketSummary ? (
            // Actual content
            <div className={`rounded-lg p-4 border ${
              marketSummary.startsWith('⚠️') 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {marketSummary.startsWith('⚠️') ? (
                    <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold mb-1 ${
                    marketSummary.startsWith('⚠️') ? 'text-yellow-900' : 'text-blue-900'
                  }`}>Market Summary</h3>
                  <p className={`text-sm leading-relaxed ${
                    marketSummary.startsWith('⚠️') ? 'text-yellow-700' : 'text-gray-700'
                  }`}>{marketSummary}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Account Dashboard */}
        {accountSummary && (
          <div className="mb-8 space-y-6">
            {/* Account Overview */}
            <AccountOverview 
              account={accountSummary.account}
              totalPL={accountSummary.totalPL}
              totalPLPercent={accountSummary.totalPLPercent}
              dayPL={accountSummary.dayPL}
              dayPLPercent={accountSummary.dayPLPercent}
              isPaper={accountSummary.isPaper}
            />
            
            {/* Positions and Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Positions positions={accountSummary.positions} />
              <OpenOrders orders={accountSummary.openOrders} />
            </div>
          </div>
        )}

        {/* Watchlist Section */}
        <div className="mb-4">
          {/* Desktop layout - title and controls on same row */}
          <div className="hidden sm:flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Watchlist</h2>
            <div className="flex items-center space-x-3">
              <AddTicker />
              <TimeRangeSelector />
            </div>
          </div>
          
          {/* Mobile layout - stacked vertically */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900">Watchlist</h2>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <AddTicker />
              <TimeRangeSelector />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {stocksData.map((stock) => {
            // Find watchlist entry for this symbol
            const watchlistEntry = watchlistDetails.find(w => w.symbol === stock.symbol);
            const logoUrl = logos[stock.symbol] || null;
            
            return (
              <StockChart
                key={stock.symbol}
                stockData={stock}
                watchlistEntry={watchlistEntry}
                logoUrl={logoUrl}
              />
            );
          })}
        </div>

        {/* Diagnostic Metrics */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="text-center space-y-2">
            {loadSource && (
              <div className="flex items-center justify-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  loadSource === 'cache' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {loadSource === 'cache' ? '⚡ Cache' : '🌐 API'}
                </span>
                {loadTime && (
                  <span className="text-xs text-gray-400">
                    {loadTime}ms
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-center items-center gap-3 text-xs text-gray-400">
              {dateRange && (
                <span>
                  📅 {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                </span>
              )}
              {cacheStats && (
                <span>
                  📊 {cacheStats.totalRecords.toLocaleString()} cached
                </span>
              )}
              {watchlistStats && (
                <span>
                  📋 {watchlistStats.activeSymbols} symbols
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
