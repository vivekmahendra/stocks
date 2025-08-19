import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, Line } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { timeFormat } from 'd3-time-format';
import { extent, bisector } from 'd3-array';
import { CompanyLogo } from './company-logo';
import { TimeRangeSelector } from './time-range-selector';
import { calculateMovingAverages, COMMON_MA_PERIODS } from '../utils/technical-indicators';
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
  const [showMovingAverages, setShowMovingAverages] = useState({ 
    20: false, 
    50: true, 
    200: true 
  });
  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    date: Date;
    price: number;
    maValues: Record<number, number>;
    visible: boolean;
  } | null>(null);

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

  // Calculate moving averages
  const enabledMAPeriods = Object.entries(showMovingAverages)
    .filter(([_, enabled]) => enabled)
    .map(([period, _]) => parseInt(period));
  
  const movingAverages = calculateMovingAverages(data, enabledMAPeriods, 'SMA');

  // Chart dimensions
  const { width, height } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Scales
  const dateExtent = extent(data, d => d.date) as [Date, Date];
  
  // Include moving average values in price extent
  let allPrices = data.map(d => d.price);
  Object.values(movingAverages).forEach(maData => {
    allPrices = [...allPrices, ...maData.map(point => point.value)];
  });
  const priceExtent = extent(allPrices) as [number, number];
  
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

  // Bisector for finding closest data point
  const bisectDate = bisector<typeof data[0], Date>((d) => d.date).left;

  // Mouse event handlers
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;
    const y = event.clientY - rect.top - margin.top;

    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) {
      setCrosshair(null);
      return;
    }

    // Convert x position to date
    const mouseDate = xScale.invert(x);
    
    // Find closest data point
    const index = bisectDate(data, mouseDate);
    const d0 = data[index - 1];
    const d1 = data[index];
    
    if (!d0 && !d1) {
      setCrosshair(null);
      return;
    }
    
    // Choose closer data point
    const d = !d0 ? d1 : !d1 ? d0 : 
      mouseDate.getTime() - d0.date.getTime() > d1.date.getTime() - mouseDate.getTime() ? d1 : d0;

    // Get moving average values for this date
    const maValues: Record<number, number> = {};
    Object.entries(movingAverages).forEach(([period, maData]) => {
      const maPoint = maData.find(point => 
        Math.abs(point.date.getTime() - d.date.getTime()) < 24 * 60 * 60 * 1000 // within 1 day
      );
      if (maPoint) {
        maValues[parseInt(period)] = maPoint.value;
      }
    });

    setCrosshair({
      x: xScale(d.date) ?? 0,
      y: yScale(d.price) ?? 0,
      date: d.date,
      price: d.price,
      maValues,
      visible: true,
    });
  }, [data, xScale, yScale, innerWidth, innerHeight, movingAverages, bisectDate]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
  }, []);

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
          <div className="flex items-center space-x-4">
            {/* Moving Average Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-500">Moving Averages:</span>
              {[20, 50, 200].map((period) => {
                const colors = {
                  20: 'bg-amber-500',
                  50: 'bg-red-500', 
                  200: 'bg-purple-500'
                };
                
                return (
                  <label key={period} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMovingAverages[period as keyof typeof showMovingAverages]}
                      onChange={(e) => {
                        setShowMovingAverages(prev => ({
                          ...prev,
                          [period]: e.target.checked
                        }));
                      }}
                      className="sr-only"
                    />
                    <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                      showMovingAverages[period as keyof typeof showMovingAverages]
                        ? `${colors[period as keyof typeof colors]} border-transparent`
                        : 'border-gray-300 bg-white'
                    }`} />
                    <span className="text-xs text-gray-600">MA{period}</span>
                  </label>
                );
              })}
            </div>
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
      </div>

      {/* Chart */}
      <div className="w-full bg-gray-50 rounded-lg p-4">
        <svg 
          width={width} 
          height={height} 
          className="max-w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
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

            {/* Price Line */}
            <LinePath
              data={data}
              x={d => xScale(getDate(d)) ?? 0}
              y={d => yScale(getPrice(d)) ?? 0}
              stroke={color}
              strokeWidth={2.5}
              curve={curveMonotoneX}
            />

            {/* Moving Average Lines */}
            {Object.entries(movingAverages).map(([period, maData]) => {
              const periodNum = parseInt(period);
              let maColor = '#6b7280'; // default gray
              let strokeWidth = 1.5;
              
              // Color coding for different periods
              if (periodNum === 20) {
                maColor = '#f59e0b'; // amber
              } else if (periodNum === 50) {
                maColor = '#ef4444'; // red
                strokeWidth = 2;
              } else if (periodNum === 200) {
                maColor = '#8b5cf6'; // purple
                strokeWidth = 2.5;
              }
              
              return (
                <LinePath
                  key={`ma-${period}`}
                  data={maData}
                  x={d => xScale(d.date) ?? 0}
                  y={d => yScale(d.value) ?? 0}
                  stroke={maColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.8}
                  curve={curveMonotoneX}
                />
              );
            })}

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

            {/* Crosshair */}
            {crosshair && (
              <g>
                {/* Vertical line */}
                <Line
                  from={{ x: crosshair.x, y: 0 }}
                  to={{ x: crosshair.x, y: innerHeight }}
                  stroke="#374151"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="4,4"
                />
                
                {/* Horizontal line */}
                <Line
                  from={{ x: 0, y: crosshair.y }}
                  to={{ x: innerWidth, y: crosshair.y }}
                  stroke="#374151"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="4,4"
                />
                
                {/* Data point circle */}
                <circle
                  cx={crosshair.x}
                  cy={crosshair.y}
                  r={4}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            )}
          </Group>
        </svg>

        {/* Tooltip */}
        {crosshair && (
          <div 
            className="absolute bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
            style={{
              left: Math.min(crosshair.x + margin.left + 10, width - 200),
              top: Math.max(crosshair.y + margin.top - 10, 10),
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
              {Object.entries(crosshair.maValues).map(([period, value]) => {
                const colors: Record<number, string> = {
                  20: 'text-amber-400',
                  50: 'text-red-400',
                  200: 'text-purple-400',
                };
                const colorClass = colors[Number(period)] || 'text-gray-400';
                
                return (
                  <div key={period} className={colorClass}>
                    MA{period}: ${value.toFixed(2)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Time Range Selector - positioned below chart on the right */}
      <div className="flex justify-end mt-4">
        <TimeRangeSelector />
      </div>
    </div>
  );
}