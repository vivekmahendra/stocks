import type { Route } from "./+types/home";
import { useLoaderData, useActionData, redirect, Link } from "react-router";
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
import { getMarketTime, getMostRecentTradingDay } from "../lib/market-time";

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
  const forceRefresh = url.searchParams.get("refresh") === "true";
  
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
        logos: {} as Record<string, string | null>,
        accountSummary: null,
        error: 'Missing Alpaca API credentials. Please check your .env file.',
        cacheStats: null,
        watchlistStats: null,
        loadSource: null,
        loadTime: null,
        dateRange: null,
        chartDateRange: null,
      };
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        stocksData: [],
        watchlistDetails: [],
        logos: {} as Record<string, string | null>,
        accountSummary: null,
        error: 'Missing Supabase credentials. Please check your .env file.',
        cacheStats: null,
        watchlistStats: null,
        loadSource: null,
        loadTime: null,
        dateRange: null,
        chartDateRange: null,
      };
    }

    // Calculate date range based on URL parameter (for chart display)
    const chartDateRange = getDateRangeFromParam(rangeParam);
    
    // For data fetching, we need a broader range to ensure:
    // 1. Latest prices (extend to most recent trading day)
    // 2. "Since added" calculations (extend back to earliest watchlist entry)
    let dataStartDate = chartDateRange.startDate;
    const dataEndDate = getMostRecentTradingDay(); // Use most recent trading day, not calendar day
    
    // Find the earliest added_date to ensure we can calculate "since added"
    if (watchlistDetails.length > 0) {
      const earliestAddedDate = new Date(Math.min(...watchlistDetails.map(w => new Date(w.added_date).getTime())));
      // Use the earlier of chart start date or earliest added date
      if (earliestAddedDate < dataStartDate) {
        dataStartDate = earliestAddedDate;
      }
    }
    
    // Fetch data using cache service (checks cache first, then API)
    const result = await stockCacheService.fetchAndCacheStockData(
      symbols,
      dataStartDate,
      dataEndDate,
      '1Day',
      forceRefresh
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
    
    // Fetch market summary server-side
    let marketSummary = null;
    try {
      const { marketSummaryCacheService } = await import('../services/market-summary-cache');
      marketSummary = await marketSummaryCacheService.getMarketSummary();
      console.log('✅ Market summary loaded:', marketSummary ? 'success' : 'no data');
    } catch (error) {
      console.error('⚠️ Could not load market summary:', error);
      // Continue without market summary - this is not critical for basic functionality
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
      dateRange: `${dataStartDate.toISOString().split('T')[0]} to ${dataEndDate.toISOString().split('T')[0]}`,
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
      dateRange: { startDate: dataStartDate, endDate: dataEndDate },
      chartDateRange: chartDateRange
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
      chartDateRange: null,
    };
  }
}

// Avoid re-running expensive calls on every navigation
export function shouldRevalidate({ currentUrl, nextUrl, formMethod }: { currentUrl: URL; nextUrl: URL; formMethod?: string }) {
  // Only revalidate if query params change or it's a form submission
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.search !== nextUrl.search) return true;
  return false;
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-xl text-red-600 mb-4">Error: {data.error}</p>
          <p className="text-gray-600 text-sm">
            Check the server console for more details.
          </p>
        </div>
      </div>
    );
  }

  if (!data.stocksData || data.stocksData.length === 0) {
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

        {/* Market Summary from Grok - Server-side */}
        {data.marketSummary && (
          <MarketSummaryCard summary={data.marketSummary} />
        )}

        {/* Account Dashboard */}
        {data.accountSummary && (
          <div className="mb-8 space-y-6">
            {/* Account Overview */}
            <AccountOverview 
              account={data.accountSummary.account}
              totalPL={data.accountSummary.totalPL}
              totalPLPercent={data.accountSummary.totalPLPercent}
              dayPL={data.accountSummary.dayPL}
              dayPLPercent={data.accountSummary.dayPLPercent}
              isPaper={data.accountSummary.isPaper}
            />
            
            {/* Positions and Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Positions positions={data.accountSummary.positions} />
              <OpenOrders orders={data.accountSummary.openOrders} />
            </div>
          </div>
        )}

        {/* Watchlist Section */}
        <div className="mb-4">
          {/* Desktop layout - title and controls on same row */}
          <div className="hidden sm:flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Watchlist</h2>
            <div className="flex items-center space-x-3">
              <Link 
                to="/?refresh=true"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Refresh prices from market"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Link>
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
              <Link 
                to="/?refresh=true"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Link>
              <AddTicker />
              <TimeRangeSelector />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data.stocksData.map((stock) => {
            // Find watchlist entry for this symbol
            const watchlistEntry = data.watchlistDetails.find(w => w.symbol === stock.symbol);
            const logoUrl = (data.logos && typeof data.logos === 'object' && stock.symbol in data.logos ? (data.logos as Record<string, string | null>)[stock.symbol] : null) || null;
            
            return (
              <StockChart
                key={stock.symbol}
                stockData={stock}
                watchlistEntry={watchlistEntry}
                logoUrl={logoUrl}
                chartDateRange={data.chartDateRange}
              />
            );
          })}
        </div>

        {/* Diagnostic Metrics */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="text-center space-y-2">
            {data.loadSource && (
              <div className="flex items-center justify-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  data.loadSource === 'cache' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {data.loadSource === 'cache' ? '⚡ Cache' : '🌐 API'}
                </span>
                {data.loadTime && (
                  <span className="text-xs text-gray-400">
                    {data.loadTime}ms
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-center items-center gap-3 text-xs text-gray-400">
              {data.dateRange && (
                <span>
                  📅 {data.dateRange.startDate.toLocaleDateString()} - {data.dateRange.endDate.toLocaleDateString()}
                </span>
              )}
              {data.cacheStats && (
                <span>
                  📊 {data.cacheStats.totalRecords.toLocaleString()} cached
                </span>
              )}
              {data.watchlistStats && (
                <span>
                  📋 {data.watchlistStats.activeSymbols} symbols
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


function MarketSummaryCard({ summary }: { summary: string }) {
  return (
    <div className="mb-6">
      <div className={`rounded-lg p-4 border ${
        summary.startsWith('⚠️') 
          ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {summary.startsWith('⚠️') ? (
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
              summary.startsWith('⚠️') ? 'text-yellow-900' : 'text-blue-900'
            }`}>Market Summary</h3>
            <p className={`text-sm leading-relaxed ${
              summary.startsWith('⚠️') ? 'text-yellow-700' : 'text-gray-700'
            }`}>{summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
