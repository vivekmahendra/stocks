import type { Route } from "./+types/home";
import { useLoaderData } from "react-router";
import { StockChart } from "../components/stock-chart";
import { createAlpacaAPI } from "../lib/alpaca-api";
import type { StockData } from "../types/stock";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stock Dashboard" },
    { name: "description", content: "Real-time stock dashboard powered by Alpaca" },
  ];
}

export async function loader() {
  console.log('🔄 Home loader starting...');
  
  const symbols = ['SPY', 'TSLA', 'AAPL', 'GOOG'];
  
  try {
    // Get environment variables
    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    
    console.log('🔑 Environment variables:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
      apiKeyPrefix: apiKey?.substring(0, 8),
      secretKeyPrefix: secretKey?.substring(0, 8),
      allEnvVars: Object.keys(process.env).filter(key => key.includes('ALPACA')),
    });

    if (!apiKey || !secretKey) {
      console.error('❌ Missing API credentials');
      return {
        stocksData: [],
        error: 'Missing Alpaca API credentials. Please check your .env file.',
      };
    }

    const alpacaAPI = createAlpacaAPI(apiKey, secretKey);
    const stocksData = await alpacaAPI.getStockBars(symbols);
    
    console.log('✅ Successfully loaded stock data:', {
      symbols: stocksData.map(s => s.symbol),
      totalBars: stocksData.reduce((sum, stock) => sum + stock.bars.length, 0),
    });

    return { stocksData, error: null };
  } catch (error) {
    console.error('❌ Loader error:', error);
    return {
      stocksData: [],
      error: error instanceof Error ? error.message : 'Failed to fetch stock data',
    };
  }
}

export default function Home() {
  const { stocksData, error } = useLoaderData<typeof loader>();
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

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
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Stock Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stocksData.map((stock, index) => (
            <StockChart
              key={stock.symbol}
              stockData={stock}
              color={colors[index]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
