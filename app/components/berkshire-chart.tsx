import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, Line, Bar } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { extent, bisector } from 'd3-array';
import { parseAlpacaDate, isTradingDay, formatMarketDate } from '../lib/market-time';
import { TimeRangeSelector } from './time-range-selector';
import { useSearchParams } from "react-router";
import type { StockData } from '../types/stock';
import type { FinancialRatios } from '../services/financial-ratios';

// Berkshire-specific time range selector that defaults to 1Y
function BerkshireTimeRangeSelector() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRange = searchParams.get("range") || "1Y"; // Default to 1Y for Berkshire

  const timeRanges = [
    { label: "1W", value: "1W" },
    { label: "1mo", value: "1M" },
    { label: "3mo", value: "3M" },
    { label: "6mo", value: "6M" },
    { label: "1yr", value: "1Y" },
    { label: "2yr", value: "2Y" },
    { label: "5yr", value: "5Y" },
    { label: "Max", value: "MAX" },
  ];

  const handleRangeChange = (range: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("range", range);
    setSearchParams(newParams);
  };

  return (
    <div className="inline-flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      {timeRanges.map((range, index) => (
        <button
          key={range.value}
          onClick={() => handleRangeChange(range.value)}
          className={`
            relative px-3 py-1.5 text-xs font-semibold transition-all duration-200
            ${currentRange === range.value
              ? "bg-gray-900 text-white rounded-md"
              : "text-gray-600 hover:text-gray-900"
            }
            ${index !== 0 && currentRange !== range.value && timeRanges[index - 1].value !== currentRange 
              ? "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-px before:bg-gray-200" 
              : ""
            }
          `}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

interface BerkshireChartProps {
  stockData: StockData;
  ratiosData?: FinancialRatios[];
}

const margin = { top: 20, right: 80, bottom: 40, left: 60 };

export function BerkshireChart({ stockData, ratiosData = [] }: BerkshireChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [showBVPS, setShowBVPS] = useState(false);
  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    date: Date;
    price: number;
    volume: number;
    bvps?: number;
    visible: boolean;
  } | null>(null);
  
  const currentRange = searchParams.get("range") || "1Y";

  // Function to get appropriate date format based on time range
  const getDateFormatter = (range: string) => {
    switch (range) {
      case "1D":
      case "1W":
        return (date: Date) => date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric'
        });
      case "1M":
      case "3M":
        return (date: Date) => date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case "6M":
      case "1Y":
        return (date: Date) => date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
      case "2Y":
      case "5Y":
      case "MAX":
        return (date: Date) => date.getFullYear().toString();
      default:
        return (date: Date) => formatMarketDate(date, 'short');
    }
  };

  const dateFormatter = getDateFormatter(currentRange);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerPadding = 48;
        setDimensions({
          width: Math.max(300, rect.width - containerPadding),
          height: window.innerWidth < 640 ? 300 : 400,
        });
      }
    };

    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  if (!stockData.bars || stockData.bars.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {stockData.symbol} Price Chart
        </h3>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            <p className="text-lg">No chart data available</p>
            <p className="text-sm text-gray-400">Please check back later</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedBars = [...stockData.bars].sort((a, b) => 
    new Date(a.t).getTime() - new Date(b.t).getTime()
  );

  const data = sortedBars
    .map(bar => ({
      date: parseAlpacaDate(bar.t),
      price: bar.c,
      volume: bar.v,
      high: bar.h,
      low: bar.l,
      open: bar.o,
      originalTimestamp: bar.t,
    }))
    .filter(d => isTradingDay(d.date));

  // Process BVPS data - quarterly data points
  // Filter to only include BVPS data within the stock data date range to prevent overflow
  const stockDateExtent = data.length > 0 ? extent(data, d => d.date) as [Date, Date] : [new Date(), new Date()];
  
  const bvpsData = ratiosData
    .filter(r => r.book_value_per_share !== null)
    .map(r => ({
      date: new Date(r.date),
      bvps: r.book_value_per_share!,
      period: r.period,
      fiscalYear: r.fiscal_year,
    }))
    .filter(d => {
      // Only include BVPS data within the stock data date range
      return data.length === 0 || (d.date >= stockDateExtent[0] && d.date <= stockDateExtent[1]);
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const latestPrice = data[data.length - 1]?.price;
  const firstPrice = data[0]?.price;
  const change = latestPrice && firstPrice ? latestPrice - firstPrice : 0;
  const changePercent = firstPrice ? (change / firstPrice) * 100 : 0;

  // Find the highest and lowest points
  const highPoint = data.reduce((max, current) => 
    current.high > max.high ? current : max, data[0]);
  const lowPoint = data.reduce((min, current) => 
    current.low < min.low ? current : min, data[0]);

  const { width, height } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  const dateExtent = extent(data, d => d.date) as [Date, Date];
  const priceExtent = extent(data, d => d.price) as [number, number];
  const volumeExtent = extent(data, d => d.volume) as [number, number];
  const bvpsExtent = bvpsData.length > 0 ? extent(bvpsData, d => d.bvps) as [number, number] : [0, 0];
  
  const dateRange = dateExtent[1].getTime() - dateExtent[0].getTime();
  const padding = dateRange * 0.02;
  const extendedDateDomain: [Date, Date] = [
    new Date(dateExtent[0].getTime() - padding),
    new Date(dateExtent[1].getTime() + padding)
  ];
  
  // Add padding to price domain to prevent markers from being cut off
  // Include BVPS range if showing BVPS
  let minPrice = priceExtent[0];
  let maxPrice = priceExtent[1];
  
  if (showBVPS && bvpsData.length > 0) {
    minPrice = Math.min(minPrice, bvpsExtent[0]);
    maxPrice = Math.max(maxPrice, bvpsExtent[1]);
  }
  
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1; // 10% padding on top and bottom
  const extendedPriceDomain: [number, number] = [
    minPrice - pricePadding,
    maxPrice + pricePadding
  ];
  
  const xScale = scaleTime({
    range: [0, innerWidth],
    domain: extendedDateDomain,
  });

  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: extendedPriceDomain,
    nice: true,
  });

  // Volume scale overlaid on the chart - scales from bottom to about 30% of chart height
  const volumeScale = scaleLinear({
    range: [innerHeight, innerHeight * 0.7], // Volume bars take up bottom 30% of chart
    domain: [0, volumeExtent[1]],
    nice: true,
  });

  const getDate = (d: typeof data[0]) => d.date;
  const getPrice = (d: typeof data[0]) => d.price;

  const bisectDate = bisector<typeof data[0], Date>((d) => d.date).left;
  const bisectBVPSDate = bisector<typeof bvpsData[0], Date>((d) => d.date).left;

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Calculate the scale factors for the SVG
    const scaleX = svg.clientWidth / width;
    const scaleY = svg.clientHeight / height;
    
    // Get mouse position relative to SVG, accounting for scaling
    const mouseX = (event.clientX - rect.left) / scaleX;
    const mouseY = (event.clientY - rect.top) / scaleY;
    
    const x = mouseX - margin.left;
    const y = mouseY - margin.top;

    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) {
      setCrosshair(null);
      return;
    }

    const mouseDate = xScale.invert(x);
    const index = bisectDate(data, mouseDate);
    const d0 = data[index - 1];
    const d1 = data[index];
    
    if (!d0 && !d1) {
      setCrosshair(null);
      return;
    }
    
    const d = !d0 ? d1 : !d1 ? d0 : 
      mouseDate.getTime() - d0.date.getTime() > d1.date.getTime() - mouseDate.getTime() ? d1 : d0;

    // Find closest BVPS data point if showing BVPS
    let closestBVPS: number | undefined;
    if (showBVPS && bvpsData.length > 0) {
      const bvpsIndex = bisectBVPSDate(bvpsData, mouseDate);
      const bvps0 = bvpsData[bvpsIndex - 1];
      const bvps1 = bvpsData[bvpsIndex];
      
      if (bvps0 || bvps1) {
        const closestBVPSData = !bvps0 ? bvps1 : !bvps1 ? bvps0 :
          mouseDate.getTime() - bvps0.date.getTime() > bvps1.date.getTime() - mouseDate.getTime() ? bvps1 : bvps0;
        closestBVPS = closestBVPSData.bvps;
      }
    }

    setCrosshair({
      x: xScale(d.date) ?? 0,
      y: yScale(d.price) ?? 0,
      date: d.date,
      price: d.price,
      volume: d.volume,
      bvps: closestBVPS,
      visible: true,
    });
  }, [data, xScale, yScale, innerWidth, innerHeight, bisectDate, width, height]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" ref={containerRef}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-semibold text-gray-800">
              ${stockData.symbol}
            </h3>
            {ratiosData.length > 0 && (
              <button
                onClick={() => setShowBVPS(!showBVPS)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  showBVPS 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Book Value
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              ${latestPrice?.toFixed(2)}
            </span>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              change >= 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-50 rounded-lg p-4 overflow-hidden">
        <svg 
          width={width} 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <Group left={margin.left} top={margin.top}>
            <GridRows
              scale={yScale}
              width={innerWidth}
              strokeDasharray="3,3"
              stroke="#e5e7eb"
              strokeOpacity={0.8}
            />
            <GridColumns
              scale={xScale}
              height={innerHeight}
              strokeDasharray="3,3"
              stroke="#e5e7eb"
              strokeOpacity={0.8}
            />

            <LinePath
              data={data}
              x={d => xScale(getDate(d)) ?? 0}
              y={d => yScale(getPrice(d)) ?? 0}
              stroke="#000000"
              strokeWidth={2}
              curve={curveMonotoneX}
            />

            {/* BVPS Line - only show if toggled on */}
            {showBVPS && bvpsData.length > 0 && (
              <LinePath
                data={bvpsData}
                x={d => xScale(d.date) ?? 0}
                y={d => yScale(d.bvps) ?? 0}
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="5,5"
                curve={curveMonotoneX}
              />
            )}

            {/* BVPS Data Points */}
            {showBVPS && bvpsData.map((d, i) => (
              <circle
                key={`bvps-point-${i}`}
                cx={xScale(d.date)}
                cy={yScale(d.bvps)}
                r={3}
                fill="#059669"
                stroke="white"
                strokeWidth={1}
              />
            ))}

            {/* High Point Marker */}
            {highPoint && (
              <g>
                <rect
                  x={xScale(highPoint.date) - 8}
                  y={yScale(highPoint.high) - 25}
                  width={16}
                  height={16}
                  fill="#6b7280"
                  rx={2}
                />
                <text
                  x={xScale(highPoint.date)}
                  y={yScale(highPoint.high) - 14}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  H
                </text>
              </g>
            )}

            {/* Low Point Marker */}
            {lowPoint && (
              <g>
                <rect
                  x={xScale(lowPoint.date) - 8}
                  y={yScale(lowPoint.low) + 9}
                  width={16}
                  height={16}
                  fill="#6b7280"
                  rx={2}
                />
                <text
                  x={xScale(lowPoint.date)}
                  y={yScale(lowPoint.low) + 20}
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  L
                </text>
              </g>
            )}

            {/* Volume Bars - Overlaid */}
            {data.map((d, i) => {
              const barWidth = innerWidth / data.length * 0.6; // 60% of available width for cleaner overlay
              return (
                <Bar
                  key={`volume-bar-${i}`}
                  x={xScale(d.date) - barWidth / 2}
                  y={volumeScale(d.volume)}
                  width={barWidth}
                  height={innerHeight - volumeScale(d.volume)}
                  fill="#6b7280"
                  fillOpacity={0.25}
                />
              );
            })}

            <AxisBottom
              top={innerHeight}
              scale={xScale}
              tickFormat={(value) => dateFormatter(value as Date)}
              stroke="#6b7280"
              tickStroke="#6b7280"
              numTicks={currentRange === '5Y' || currentRange === '2Y' || currentRange === 'MAX' ? 6 : 8}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                textAnchor: 'middle',
              })}
            />

            <AxisLeft
              scale={yScale}
              tickFormat={(value) => `$${Number(value).toFixed(2)}`}
              stroke="#6b7280"
              tickStroke="#6b7280"
              numTicks={8}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                textAnchor: 'end',
                dx: -5,
              })}
            />

            {/* Volume Axis - Positioned for overlay */}
            <AxisRight
              left={innerWidth}
              scale={volumeScale}
              tickFormat={(value) => {
                const num = Number(value);
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                return num.toString();
              }}
              stroke="#9ca3af"
              tickStroke="#9ca3af"
              numTicks={3}
              tickLabelProps={() => ({
                fill: '#9ca3af',
                fontSize: 9,
                textAnchor: 'start',
                dx: 5,
              })}
            />

            {crosshair && (
              <g>
                <Line
                  from={{ x: crosshair.x, y: 0 }}
                  to={{ x: crosshair.x, y: innerHeight }}
                  stroke="#374151"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="4,4"
                />
                
                <Line
                  from={{ x: 0, y: crosshair.y }}
                  to={{ x: innerWidth, y: crosshair.y }}
                  stroke="#374151"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="4,4"
                />
                
                <circle
                  cx={crosshair.x}
                  cy={crosshair.y}
                  r={4}
                  fill="#000000"
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            )}
          </Group>
        </svg>

        {crosshair && (
          <div 
            className="absolute bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
            style={{
              left: crosshair.x + margin.left + (window.innerWidth < 640 ? 150 : 200) > width 
                ? crosshair.x + margin.left - (window.innerWidth < 640 ? 140 : 180)
                : crosshair.x + margin.left + 10,
              top: crosshair.y + margin.top + (window.innerWidth < 640 ? 120 : 200),
            }}
          >
            <div className="space-y-1">
              <div className="font-medium">
                {crosshair.date.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-green-400 font-medium">
                Price: ${crosshair.price.toFixed(2)}
              </div>
              <div className="text-blue-400 font-medium">
                Volume: {crosshair.volume >= 1000000 
                  ? `${(crosshair.volume / 1000000).toFixed(1)}M` 
                  : crosshair.volume >= 1000 
                    ? `${(crosshair.volume / 1000).toFixed(0)}K`
                    : crosshair.volume.toLocaleString()}
              </div>
              {showBVPS && crosshair.bvps && (
                <div className="text-green-400 font-medium">
                  Book Value: ${crosshair.bvps.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-4">
        <BerkshireTimeRangeSelector />
      </div>
    </div>
  );
}