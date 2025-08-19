import type { Route } from "./+types/ticker.symbol";
import { useLoaderData, redirect, Link } from "react-router";
import { TickerDetailChart } from "../components/ticker-detail-chart";
import { TickerNotes } from "../components/ticker-notes";
import { TimeRangeSelector, getDateRangeFromParam } from "../components/time-range-selector";
import { Layout } from "../components/layout";
import { CompanyLogo } from "../components/company-logo";
import { stockCacheService } from "../services/stock-cache";
import { watchlistService } from "../services/watchlist";
import { notesService } from "../services/notes";
import { getLogoService } from "../services/logo";
import type { StockData } from "../types/stock";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.symbol?.toUpperCase()} - Stock Dashboard` },
    { name: "description", content: `Detailed analysis and insights for ${params.symbol?.toUpperCase()}` },
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
        console.log(`✅ Added note for ${symbol}`);
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
        console.log(`✅ Updated note ${noteId}`);
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
        console.log(`✅ Deleted note ${noteId}`);
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

  console.log(`🔄 Loading ticker detail for ${symbol}`);

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

    // Fetch stock data, watchlist info, notes, and logo in parallel
    const logoService = getLogoService();
    const [stockResult, watchlistDetails, notes, logoUrl] = await Promise.all([
      stockCacheService.fetchAndCacheStockData([symbol], startDate, endDate, '1Day'),
      watchlistService.getWatchlist(),
      notesService.getNotesBySymbol(symbol),
      logoService ? logoService.getLogoUrl(symbol) : Promise.resolve(null),
    ]);

    const stockData = stockResult.data.find(s => s.symbol === symbol);
    if (!stockData) {
      throw new Response(`No data found for ${symbol}`, { status: 404 });
    }

    const watchlistEntry = watchlistDetails.find(w => w.symbol === symbol);
    const loadTime = Date.now() - loadStartTime;

    console.log(`✅ Successfully loaded ticker detail for ${symbol}:`, {
      bars: stockData.bars.length,
      notes: notes.length,
      loadSource: stockResult.loadedFromCache ? 'cache' : 'api',
      loadTime: `${loadTime}ms`,
      logoFound: !!logoUrl,
    });

    return {
      symbol,
      stockData,
      watchlistEntry,
      notes,
      logoUrl,
      dateRange: { startDate, endDate },
      loadSource: stockResult.loadedFromCache ? 'cache' : 'api',
      loadTime,
      error: null,
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
      dateRange: null,
      loadSource: null,
      loadTime: null,
      error: error instanceof Error ? error.message : 'Failed to load ticker data',
    };
  }
}

export default function TickerDetail() {
  const { symbol, stockData, watchlistEntry, notes, logoUrl, dateRange, loadSource, loadTime, error } = useLoaderData<typeof loader>();

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
              <span>📝 {notes.length} notes</span>
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