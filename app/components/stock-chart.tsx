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

interface StockChartProps {
  stockData: StockData;
  color?: string;
}

const margin = { top: 15, right: 15, bottom: 30, left: 50 };

export function StockChart({ 
  stockData, 
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
    </div>
  );
}