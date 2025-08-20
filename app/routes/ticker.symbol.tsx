import type { Route } from "./+types/ticker.symbol";
import { useLoaderData, redirect, Link } from "react-router";
import { TickerDetailChart } from "../components/ticker-detail-chart";
import { TickerNotes } from "../components/ticker-notes";
import { TimeRangeSelector, getDateRangeFromParam } from "../components/time-range-selector";
import { Layout } from "../components/layout";
import { CompanyLogo } from "../components/company-logo";
import { BerkshireHathawayPage } from "../components/berkshire-hathaway-page";
import { stockCacheService } from "../services/stock-cache";
import { watchlistService } from "../services/watchlist";
import { notesService } from "../services/notes";
import { getLogoService } from "../services/logo";
import { repurchaseService } from "../services/repurchases";
import { financialRatiosService } from "../services/financial-ratios";
import type { StockData } from "../types/stock";

export function meta({ params }: Route.MetaArgs) {
  const symbol = params.symbol?.toUpperCase();
  
  if (symbol === 'BRK.B') {
    return [
      { title: "Berkshire Hathaway Class B (BRK.B) - Investment Conglomerate" },
      { name: "description", content: "Warren Buffett's Berkshire Hathaway Class B shares - Comprehensive analysis of the legendary investment conglomerate" },
    ];
  }
  
  return [
    { title: `${symbol} - Stock Dashboard` },
    { name: "description", content: `Detailed analysis and insights for ${symbol}` },
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  const symbol = params.symbol?.toUpperCase();
  if (!symbol) {
    return { error: "Symbol is required" };
  }

  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "add-note") {
    const noteText = formData.get("noteText")?.toString()?.trim();
    const noteType = formData.get("noteType")?.toString() || "general";

    if (!noteText) {
      return { error: "Note text is required" };
    }

    try {
      const result = await notesService.addNote(symbol, noteText, noteType);
      if (result) {
        return redirect(`/ticker/${symbol}`);
      } else {
        return { error: "Failed to add note" };
      }
    } catch (error) {
      console.error(`❌ Error adding note:`, error);
      return { error: error instanceof Error ? error.message : "Failed to add note" };
    }
  }

  if (actionType === "update-note") {
    const noteId = parseInt(formData.get("noteId")?.toString() || "0");
    const noteText = formData.get("noteText")?.toString()?.trim();
    const noteType = formData.get("noteType")?.toString() || "general";

    if (!noteId || !noteText) {
      return { error: "Note ID and text are required" };
    }

    try {
      const result = await notesService.updateNote(noteId, {
        note_text: noteText,
        note_type: noteType,
      });
      if (result) {
        return redirect(`/ticker/${symbol}`);
      } else {
        return { error: "Failed to update note" };
      }
    } catch (error) {
      console.error(`❌ Error updating note:`, error);
      return { error: error instanceof Error ? error.message : "Failed to update note" };
    }
  }

  if (actionType === "delete-note") {
    const noteId = parseInt(formData.get("noteId")?.toString() || "0");

    if (!noteId) {
      return { error: "Note ID is required" };
    }

    try {
      const result = await notesService.deleteNote(noteId);
      if (result) {
        return redirect(`/ticker/${symbol}`);
      } else {
        return { error: "Failed to delete note" };
      }
    } catch (error) {
      console.error(`❌ Error deleting note:`, error);
      return { error: error instanceof Error ? error.message : "Failed to delete note" };
    }
  }

  return { error: "Unknown action" };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const symbol = params.symbol?.toUpperCase();
  if (!symbol) {
    throw new Response("Symbol not found", { status: 404 });
  }



  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  const loadStartTime = Date.now();

  try {
    // Check environment variables
    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!apiKey || !secretKey || !supabaseUrl || !supabaseKey) {
      throw new Error("Missing required environment variables");
    }

    // Calculate date range based on URL parameter
    const { startDate, endDate } = getDateRangeFromParam(rangeParam);
    
    // For MAX range and Berkshire, override stock data dates to go back to 2018
    let stockDataStartDate = startDate;
    let stockDataEndDate = endDate;
    
    if (symbol === 'BRK.B' && rangeParam === 'MAX') {
      stockDataStartDate = new Date(2018, 0, 1); // January 1, 2018
      stockDataEndDate = new Date(); // Today
    }

    // Fetch stock data, watchlist info, notes, logo, and company narrative in parallel
    const logoService = getLogoService();
    let companyNarrative = null;
    
    // Fetch core data in parallel
    const [stockResult, watchlistDetails, notes, logoUrl] = await Promise.all([
      stockCacheService.fetchAndCacheStockData([symbol], stockDataStartDate, stockDataEndDate, '1Day'),
      watchlistService.getWatchlist(),
      notesService.getNotesBySymbol(symbol),
      logoService ? logoService.getLogoUrl(symbol) : Promise.resolve(null),
    ]);
    
    // For Berkshire, also fetch repurchase and ratios data separately to avoid typing issues
    let repurchaseData: any[] = [];
    let ratiosData: any[] = [];
    
    if (symbol === 'BRK.B') {
      // For Berkshire, get 10 years of data regardless of time range selector
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const today = new Date();
      
      [repurchaseData, ratiosData] = await Promise.all([
        repurchaseService.getRepurchasesInDateRange('BRK-B', tenYearsAgo, today),
        financialRatiosService.getRatiosInDateRange('BRK-B', tenYearsAgo, today)
      ]);
    }
    
    // Fetch company narrative server-side
    try {
      const { companyNarrativeService } = await import('../services/company-narrative');
      companyNarrative = await companyNarrativeService.getCompanyNarrative(symbol);
    } catch (error) {
      console.error('⚠️ Could not load company narrative:', error);
      // Continue without narrative - this is not critical for basic functionality
    }

    const stockData = stockResult.data.find((s: any) => s.symbol === symbol);
    if (!stockData) {
      throw new Response(`No data found for ${symbol}`, { status: 404 });
    }

    const watchlistEntry = watchlistDetails.find((w: any) => w.symbol === symbol);
    const loadTime = Date.now() - loadStartTime;


    return {
      symbol,
      stockData,
      watchlistEntry,
      notes,
      logoUrl,
      companyNarrative,
      dateRange: { startDate, endDate },
      loadSource: stockResult.loadedFromCache ? 'cache' : 'api',
      loadTime,
      error: null,
      repurchaseData,
      ratiosData,
    };
  } catch (error) {
    console.error(`❌ Error loading ticker detail for ${symbol}:`, error);
    
    if (error instanceof Response) {
      throw error;
    }

    return {
      symbol,
      stockData: null,
      watchlistEntry: null,
      notes: [],
      logoUrl: null,
      companyNarrative: null,
      dateRange: null,
      loadSource: null,
      loadTime: null,
      error: error instanceof Error ? error.message : 'Failed to load ticker data',
      repurchaseData: [],
      ratiosData: [],
    };
  }
}


export default function TickerDetail() {
  const { symbol, stockData, watchlistEntry, notes, logoUrl, companyNarrative, dateRange, loadSource, loadTime, error, repurchaseData, ratiosData } = useLoaderData<typeof loader>();

  // If this is BRK.B, render the completely different Berkshire page
  if (symbol === 'BRK.B') {
    return <BerkshireHathawayPage 
      symbol={symbol}
      stockData={stockData}
      watchlistEntry={watchlistEntry}
      notes={notes}
      logoUrl={logoUrl}
      companyNarrative={companyNarrative}
      dateRange={dateRange}
      loadSource={loadSource}
      loadTime={loadTime}
      error={error}
      repurchaseData={repurchaseData}
      ratiosData={ratiosData}
    />;
  }

  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading {symbol}</h1>
          <p className="text-red-600 mb-4">{error || 'No data available'}</p>
          <Link 
            to="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Header with Symbol and Metadata */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 lg:mb-0">
            <div className="flex items-center space-x-3">
              <CompanyLogo symbol={symbol} logoUrl={logoUrl} size="lg" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{symbol}</h1>
                {watchlistEntry?.name && (
                  <p className="text-sm text-gray-600">{watchlistEntry.name}</p>
                )}
              </div>
            </div>
            {watchlistEntry && (
              <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                In Watchlist
              </span>
            )}
          </div>
          
          {loadSource && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                loadSource === 'cache' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {loadSource === 'cache' ? '⚡ Cache' : '🌐 API'}
              </span>
              {loadTime && <span>{loadTime}ms</span>}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8">
          {/* Chart Section */}
          <div>
            <TickerDetailChart stockData={stockData} logoUrl={logoUrl} notes={notes} />
          </div>

          {/* Company Narrative Section */}
          {companyNarrative && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {companyNarrative?.startsWith('⚠️') ? (
                    <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Narrative</h3>
                  <p className={`text-sm leading-relaxed ${
                    companyNarrative.startsWith('⚠️') ? 'text-yellow-700' : 'text-gray-700'
                  }`}>
                    {companyNarrative}
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    <span className="inline-flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Includes sentiment from X investors • Updates every 2 hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <TickerNotes symbol={symbol} notes={notes} />
          </div>
        </div>

        {/* Footer Diagnostic Info */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="text-center text-xs text-gray-400">
            <div className="flex flex-wrap justify-center items-center gap-3">
              <span>📊 {stockData.bars.length} price bars</span>
              <span>📝 {Array.isArray(notes) ? notes.length : 0} notes</span>
              {dateRange && (
                <span>📅 {Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))} days</span>
              )}
              <span>🕒 Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}