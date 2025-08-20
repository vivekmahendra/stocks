import React, { useEffect, useRef, useState } from "react";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { curveMonotoneX } from "@visx/curve";
import { extent } from "d3-array";
import { useSubmit, useNavigation, Link } from "react-router";
import { CompanyLogo } from "./company-logo";
import type { StockData } from "../types/stock";
import type { ActiveWatchlistRow } from "../types/database";
import {
  parseAlpacaDate,
  isTradingDay,
  formatMarketDate,
} from "../lib/market-time";

interface StockChartProps {
  stockData: StockData;
  watchlistEntry?: ActiveWatchlistRow;
  logoUrl?: string | null;
  color?: string;
  chartDateRange?: { startDate: Date; endDate: Date } | null;
}

const margin = { top: 10, right: 10, bottom: 20, left: 40 };

export function StockChart({
  stockData,
  watchlistEntry,
  logoUrl,
  color = "#3B82F6",
  chartDateRange,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 240, height: 160 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.formAction === "/" &&
    navigation.formData?.get("action") === "delete-ticker";

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("action", "delete-ticker");
    formData.append("symbol", stockData.symbol);

    submit(formData, { method: "post" });
    setShowDeleteModal(false);
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Account for card padding (p-3 = 12px on each side = 24px total)
        const cardPadding = 24;
        setDimensions({
          width: Math.max(240, rect.width - cardPadding), // Minimum width with padding
          height: 160, // Compact height
        });
      }
    };

    // Use timeout to ensure DOM is fully rendered
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener("resize", updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  if (!stockData.bars || stockData.bars.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-3">
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          {stockData.symbol}
        </h3>
        <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      </div>
    );
  }

  // Sort bars by date and prepare data with proper timezone handling
  const sortedBars = [...stockData.bars].sort(
    (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime()
  );

  // Use all data for price calculations (latest price, since added)
  // Parse Alpaca dates properly and filter to trading days only

  const allDataBeforeFilter = sortedBars.map((bar) => {
    const parsedDate = parseAlpacaDate(bar.t);
    return {
      date: parsedDate,
      price: bar.c,
      originalTimestamp: bar.t,
    };
  });


  const allData = allDataBeforeFilter.filter((d) => {
    const isTrading = isTradingDay(d.date);


    return isTrading;
  });


  // Log final data that will be displayed

  // Filter data for chart display based on chartDateRange
  let chartData = allData;
  if (chartDateRange) {
    chartData = allData.filter(
      (d) =>
        d.date >= chartDateRange.startDate && d.date <= chartDateRange.endDate
    );
  }

  // Use chart data for display, all data for calculations
  const data = chartData;

  // Calculate price change - use latest available price from all data, chart range for period change
  const latestPrice = allData[allData.length - 1]?.price; // Latest available price
  const chartFirstPrice = data[0]?.price; // First price in chart range
  const change =
    latestPrice && chartFirstPrice ? latestPrice - chartFirstPrice : 0;
  const changePercent = chartFirstPrice ? (change / chartFirstPrice) * 100 : 0;

  // Calculate price change since added to watchlist
  let priceAtAdded = chartFirstPrice;
  let changeSinceAdded = 0;
  let changePercentSinceAdded = 0;

  if (watchlistEntry && latestPrice) {
    // First check if we have a stored price_at_addition
    if (watchlistEntry.price_at_addition) {
      priceAtAdded = watchlistEntry.price_at_addition;
      changeSinceAdded = latestPrice - priceAtAdded;
      changePercentSinceAdded = priceAtAdded
        ? (changeSinceAdded / priceAtAdded) * 100
        : 0;
    } else {
      // Fallback to finding price from historical data
      const addedDate = new Date(watchlistEntry.added_date);


      // Find the closest trading day to when the ticker was added using all available data
      const sortedAllData = [...allData].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      // Try to find exact date match first (comparing market dates)
      let addedBar = sortedAllData.find((d) => {
        const barDateStr = formatMarketDate(d.date)
          .replace("/", "")
          .padStart(4, "0");
        const targetDateStr = formatMarketDate(addedDate)
          .replace("/", "")
          .padStart(4, "0");
        return barDateStr === targetDateStr;
      });

      if (!addedBar) {
        // Find the closest trading day on or after the added date
        addedBar = sortedAllData.find((d) => d.date >= addedDate);
      }

      if (!addedBar && sortedAllData.length > 0) {
        // If no data after added date, use the last available before it
        const reversedData = [...sortedAllData].reverse();
        addedBar = reversedData.find((d) => d.date <= addedDate);
      }

      if (addedBar) {
        priceAtAdded = addedBar.price;
        changeSinceAdded = latestPrice - priceAtAdded;
        changePercentSinceAdded = priceAtAdded
          ? (changeSinceAdded / priceAtAdded) * 100
          : 0;
      }
    }
  }

  // Chart dimensions
  const { width, height } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Scales
  const dateExtent = extent(data, (d) => d.date) as [Date, Date];
  const priceExtent = extent(data, (d) => d.price) as [number, number];

  const xScale = scaleTime({
    range: [0, innerWidth],
    domain: dateExtent,
  });

  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: priceExtent,
    nice: true,
  });

  // Accessors
  const getDate = (d: (typeof data)[0]) => d.date;
  const getPrice = (d: (typeof data)[0]) => d.price;

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden group hover:shadow-lg transition-shadow"
      ref={containerRef}
    >
      {/* Clickable Content Area */}
      <Link
        to={`/ticker/${stockData.symbol}`}
        className="block p-3 hover:bg-gray-50 transition-colors"
      >
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CompanyLogo
                  symbol={stockData.symbol}
                  logoUrl={logoUrl}
                  size="sm"
                />
                <h3 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {stockData.symbol}
                </h3>
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-lg font-bold text-gray-900">
                  ${latestPrice?.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)} ({changePercent >= 0 ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {data.length} days • Click for details
              </p>
            </div>
            {/* Delete Button - Top Right */}
            {watchlistEntry && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                disabled={isSubmitting}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Remove ${stockData.symbol} from watchlist`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="w-full overflow-hidden">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <Group left={margin.left} top={margin.top}>
              {/* Grid */}
              <GridRows
                scale={yScale}
                width={innerWidth}
                strokeDasharray="3,3"
                stroke="#f0f0f0"
                strokeOpacity={0.5}
              />

              {/* Line */}
              <LinePath
                data={data}
                x={(d) => xScale(getDate(d)) ?? 0}
                y={(d) => yScale(getPrice(d)) ?? 0}
                stroke={color}
                strokeWidth={2}
                curve={curveMonotoneX}
              />

              {/* X Axis */}
              <AxisBottom
                top={innerHeight}
                scale={xScale}
                tickFormat={(value) => formatMarketDate(value as Date, "short")}
                stroke="#d1d5db"
                tickStroke="#d1d5db"
                numTicks={3}
                tickLabelProps={() => ({
                  fill: "#6b7280",
                  fontSize: 9,
                  textAnchor: "middle",
                })}
              />

              {/* Y Axis */}
              <AxisLeft
                scale={yScale}
                tickFormat={(value) => `$${Number(value).toFixed(0)}`}
                stroke="#d1d5db"
                tickStroke="#d1d5db"
                numTicks={3}
                tickLabelProps={() => ({
                  fill: "#6b7280",
                  fontSize: 9,
                  textAnchor: "end",
                  dx: -3,
                })}
              />
            </Group>
          </svg>
        </div>

        {/* Footer with watchlist info */}
        {watchlistEntry && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div>
                <span className="text-gray-500">Added:</span>{" "}
                {new Date(watchlistEntry.added_date).toLocaleDateString()}
              </div>
              <div className="text-right">
                <div className="text-gray-500 mb-0.5 text-xs">Since added:</div>
                <div
                  className={`font-medium px-1.5 py-0.5 rounded bg-gray-100 text-xs ${changeSinceAdded >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {changeSinceAdded >= 0 ? "+" : ""}$
                  {changeSinceAdded.toFixed(2)} (
                  {changeSinceAdded >= 0 ? "+" : ""}
                  {changePercentSinceAdded.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        )}
      </Link>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Remove Ticker
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove{" "}
              <strong>{stockData.symbol}</strong> from your watchlist?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Removing...
                  </div>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
