import { Link } from "react-router";
import { BerkshireChart } from "./berkshire-chart";
import { TickerNotes } from "./ticker-notes";
import { RepurchaseHistogram } from "./repurchase-histogram";
import type { RepurchaseData } from "../services/repurchases";

interface BerkshireHathawayPageProps {
  symbol: string;
  stockData: any;
  watchlistEntry: any;
  notes: any[];
  logoUrl: string | null;
  companyNarrative: string | null;
  dateRange: any;
  loadSource: string | null;
  loadTime: number | null;
  error: string | null;
  repurchaseData: RepurchaseData[];
}

export function BerkshireHathawayPage({
  symbol,
  stockData,
  notes,
  loadSource,
  error,
  repurchaseData,
}: BerkshireHathawayPageProps) {
  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Berkshire Hathaway
          </h1>
          <p className="text-gray-600 mb-4">{error || "No data available"}</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = stockData.bars[stockData.bars.length - 1]?.c || 0;
  const previousPrice =
    stockData.bars[stockData.bars.length - 2]?.c || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent =
    previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <nav className="bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-lg font-light text-gray-900 tracking-wide">
                  stocks.vivekmahendra
                </h1>
              </Link>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 min-w-[120px]">
                  <div
                    className={`w-2 h-2 rounded-full ${loadSource === "cache" ? "bg-green-500" : "bg-blue-500"}`}
                  ></div>
                  <span className="text-gray-600 text-xs">
                    {loadSource === "cache" ? "Cache" : "API"}
                  </span>
                </div>
                <Link
                  to="/"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="relative bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-3 lg:mb-0">
              <div className="flex items-baseline">
                <span
                  className="text-4xl font-bold text-blue-900"
                  style={{ fontFamily: "Times, serif" }}
                >
                  B
                </span>
                <span
                  className="text-xl font-bold text-blue-900"
                  style={{ fontFamily: "Times, serif" }}
                >
                  ERKSHIRE{" "}
                </span>
                <span
                  className="text-4xl font-bold text-blue-900"
                  style={{ fontFamily: "Times, serif" }}
                >
                  H
                </span>
                <span
                  className="text-xl font-bold text-blue-900"
                  style={{ fontFamily: "Times, serif" }}
                >
                  ATHAWAY{" "}
                </span>
                <span
                  className="text-base font-normal text-blue-900"
                  style={{ fontFamily: "Times, serif" }}
                >
                  INC.
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${currentPrice.toFixed(2)}
              </div>
              <div
                className={`text-base font-medium ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)} ({priceChangePercent >= 0 ? "+" : ""}
                {priceChangePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <BerkshireChart stockData={stockData} />
        </div>

        <div className="mb-8">
          <RepurchaseHistogram data={repurchaseData} />
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Investment Research
          </h3>
          <TickerNotes symbol={symbol} notes={notes} />
        </div>
      </div>
    </div>
  );
}
