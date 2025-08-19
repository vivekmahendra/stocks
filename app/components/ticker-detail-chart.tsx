import React, { useEffect, useRef, useState } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { timeFormat } from 'd3-time-format';
import { extent } from 'd3-array';
import { CompanyLogo } from './company-logo';
import type { StockData } from '../types/stock';
import type { TickerNoteRow } from '../types/database';

interface TickerDetailChartProps {
  stockData: StockData;
  logoUrl?: string | null;
  notes?: TickerNoteRow[];
  color?: string;
}

const margin = { top: 20, right: 50, bottom: 40, left: 60 };

export function TickerDetailChart({ 
  stockData, 
  logoUrl,
  notes = [],
  color = '#3B82F6'
}: TickerDetailChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerPadding = 48; // Account for container padding
        setDimensions({
          width: Math.max(600, rect.width - containerPadding),
          height: 400, // Fixed height for detail view
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
      <div className="bg-white rounded-lg shadow-md p-6">
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

  // Sort bars by date and prepare data
  const sortedBars = [...stockData.bars].sort((a, b) => 
    new Date(a.t).getTime() - new Date(b.t).getTime()
  );

  const data = sortedBars.map(bar => ({
    date: new Date(bar.t),
    price: bar.c,
    volume: bar.v,
    high: bar.h,
    low: bar.l,
    open: bar.o,
  }));

  // Calculate price statistics
  const latestPrice = data[data.length - 1]?.price;
  const firstPrice = data[0]?.price;
  const change = latestPrice && firstPrice ? latestPrice - firstPrice : 0;
  const changePercent = firstPrice ? (change / firstPrice) * 100 : 0;
  
  const highPrice = Math.max(...data.map(d => d.high));
  const lowPrice = Math.min(...data.map(d => d.low));
  const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;

  // Chart dimensions
  const { width, height } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Scales
  const dateExtent = extent(data, d => d.date) as [Date, Date];
  const priceExtent = extent(data, d => d.price) as [number, number];
  
  // Extend date domain by 2% on each side to ensure data points aren't cut off
  const dateRange = dateExtent[1].getTime() - dateExtent[0].getTime();
  const padding = dateRange * 0.02;
  const extendedDateDomain: [Date, Date] = [
    new Date(dateExtent[0].getTime() - padding),
    new Date(dateExtent[1].getTime() + padding)
  ];
  
  const xScale = scaleTime({
    range: [0, innerWidth],
    domain: extendedDateDomain,
  });

  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: priceExtent,
    nice: true,
  });

  // Accessors
  const getDate = (d: typeof data[0]) => d.date;
  const getPrice = (d: typeof data[0]) => d.price;

  // Process notes to find dates that have notes
  const noteDates = new Set(
    notes.map(note => {
      const noteDate = new Date(note.created_at);
      // Normalize to just the date (remove time)
      return noteDate.toDateString();
    })
  );

  // Find chart data points that have notes
  const noteIndicators = data.filter(dataPoint => {
    const dataDate = dataPoint.date.toDateString();
    return noteDates.has(dataDate);
  });


  return (
    <div className="bg-white rounded-lg shadow-md p-6" ref={containerRef}>
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <CompanyLogo symbol={stockData.symbol} logoUrl={logoUrl} size="md" />
              <h3 className="text-xl font-semibold text-gray-800">
                {stockData.symbol} Price Chart
              </h3>
            </div>
            <div className="flex items-center space-x-4">
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
          <div className="text-right">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">High: </span>
                <span className="font-medium">${highPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Low: </span>
                <span className="font-medium">${lowPrice.toFixed(2)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Avg Volume: </span>
                <span className="font-medium">{(avgVolume / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {data.length} trading days • Last data: {data.length > 0 ? data[data.length - 1].date.toLocaleDateString() : 'N/A'}
          </p>
          {notes.length > 0 && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>Research notes ({notes.length})</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full bg-gray-50 rounded-lg p-4">
        <svg width={width} height={height} className="max-w-full">
          <Group left={margin.left} top={margin.top}>
            {/* Grid */}
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

            {/* Line */}
            <LinePath
              data={data}
              x={d => xScale(getDate(d)) ?? 0}
              y={d => yScale(getPrice(d)) ?? 0}
              stroke={color}
              strokeWidth={2.5}
              curve={curveMonotoneX}
            />

            {/* Note Indicators */}
            {noteIndicators.map((dataPoint, index) => {
              const x = xScale(getDate(dataPoint)) ?? 0;
              const y = yScale(getPrice(dataPoint)) ?? 0;
              
              return (
                <g key={`note-${index}`}>
                  {/* Outer ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    opacity={0.4}
                  />
                  {/* Note dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={4}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="cursor-pointer"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
                  />
                </g>
              );
            })}


            {/* X Axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              tickFormat={(value) => timeFormat('%m/%d')(value as Date)}
              stroke="#6b7280"
              tickStroke="#6b7280"
              numTicks={8}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                textAnchor: 'middle',
              })}
            />

            {/* Y Axis */}
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
          </Group>
        </svg>
      </div>
    </div>
  );
}