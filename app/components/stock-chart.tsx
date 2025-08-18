import React, { useEffect, useRef, useState } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { timeFormat } from 'd3-time-format';
import { extent } from 'd3-array';
import type { StockData } from '../types/stock';
import type { ActiveWatchlistRow } from '../types/database';

interface StockChartProps {
  stockData: StockData;
  watchlistEntry?: ActiveWatchlistRow;
  color?: string;
}

const margin = { top: 15, right: 15, bottom: 30, left: 50 };

export function StockChart({ 
  stockData, 
  watchlistEntry,
  color = '#3B82F6'
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 280, height: 200 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Account for card padding (p-4 = 16px on each side = 32px total)
        const cardPadding = 32;
        setDimensions({
          width: Math.max(280, rect.width - cardPadding), // Minimum width with padding
          height: 200, // Slightly smaller height to fit better
        });
      }
    };

    // Use timeout to ensure DOM is fully rendered
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  if (!stockData.bars || stockData.bars.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{stockData.symbol}</h3>
        <div className="h-60 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Sort bars by date and prepare data
  const sortedBars = [...stockData.bars].sort((a, b) => 
    new Date(a.t).getTime() - new Date(b.t).getTime()
  );

  const data = sortedBars.map(bar => ({
    date: new Date(bar.t),
    price: bar.c,
  }));

  // Calculate price change
  const latestPrice = data[data.length - 1]?.price;
  const firstPrice = data[0]?.price;
  const change = latestPrice && firstPrice ? latestPrice - firstPrice : 0;
  const changePercent = firstPrice ? (change / firstPrice) * 100 : 0;

  // Calculate price change since added to watchlist
  let priceAtAdded = firstPrice;
  let changeSinceAdded = 0;
  let changePercentSinceAdded = 0;
  
  if (watchlistEntry && latestPrice) {
    const addedDate = new Date(watchlistEntry.added_date);
    
    // Find the closest trading day to when the ticker was added
    // Sort data by date and find the first trading day on or after the added date
    const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Find the trading day closest to (but not before) the added date
    let addedBar = sortedData.find(d => d.date >= addedDate);
    
    // If no data on or after added date, use the last available data point
    if (!addedBar && sortedData.length > 0) {
      addedBar = sortedData[sortedData.length - 1];
    }
    
    // If still no data found, fallback to first data point
    if (!addedBar && sortedData.length > 0) {
      addedBar = sortedData[0];
    }
    
    if (addedBar) {
      priceAtAdded = addedBar.price;
      changeSinceAdded = latestPrice - priceAtAdded;
      changePercentSinceAdded = priceAtAdded ? (changeSinceAdded / priceAtAdded) * 100 : 0;
    }
  }

  // Chart dimensions
  const { width, height } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Scales
  const dateExtent = extent(data, d => d.date) as [Date, Date];
  const priceExtent = extent(data, d => d.price) as [number, number];
  
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
  const getDate = (d: typeof data[0]) => d.date;
  const getPrice = (d: typeof data[0]) => d.price;

  return (
    <div className="bg-white rounded-lg shadow-md p-4" ref={containerRef}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{stockData.symbol}</h3>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xl font-bold text-gray-900">
            ${latestPrice?.toFixed(2)}
          </span>
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {data.length} trading days
        </p>
      </div>

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <svg width={width} height={height} className="max-w-full">
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
              x={d => xScale(getDate(d)) ?? 0}
              y={d => yScale(getPrice(d)) ?? 0}
              stroke={color}
              strokeWidth={2}
              curve={curveMonotoneX}
            />

            {/* X Axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              tickFormat={(value) => timeFormat('%m/%d')(value as Date)}
              stroke="#d1d5db"
              tickStroke="#d1d5db"
              numTicks={4}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 10,
                textAnchor: 'middle',
              })}
            />

            {/* Y Axis */}
            <AxisLeft
              scale={yScale}
              tickFormat={(value) => `$${Number(value).toFixed(0)}`}
              stroke="#d1d5db"
              tickStroke="#d1d5db"
              numTicks={4}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 10,
                textAnchor: 'end',
                dx: -5,
              })}
            />
          </Group>
        </svg>
      </div>

      {/* Footer with watchlist info */}
      {watchlistEntry && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Added:</span>{' '}
              {new Date(watchlistEntry.added_date).toLocaleDateString()}
            </div>
            <div className="text-right">
              <div className="text-gray-500 mb-1">Since added:</div>
              <div className={`font-medium px-2 py-1 rounded bg-gray-100 ${changeSinceAdded >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {changeSinceAdded >= 0 ? '+' : ''}${changeSinceAdded.toFixed(2)} ({changeSinceAdded >= 0 ? '+' : ''}{changePercentSinceAdded.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}