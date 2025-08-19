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
import type { StockData } from '../types/stock';

interface BerkshireChartProps {
  stockData: StockData;
}

const margin = { top: 20, right: 80, bottom: 40, left: 60 };

export function BerkshireChart({ stockData }: BerkshireChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    date: Date;
    price: number;
    volume: number;
    visible: boolean;
  } | null>(null);

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
  
  const dateRange = dateExtent[1].getTime() - dateExtent[0].getTime();
  const padding = dateRange * 0.02;
  const extendedDateDomain: [Date, Date] = [
    new Date(dateExtent[0].getTime() - padding),
    new Date(dateExtent[1].getTime() + padding)
  ];
  
  // Add padding to price domain to prevent markers from being cut off
  const priceRange = priceExtent[1] - priceExtent[0];
  const pricePadding = priceRange * 0.1; // 10% padding on top and bottom
  const extendedPriceDomain: [number, number] = [
    priceExtent[0] - pricePadding,
    priceExtent[1] + pricePadding
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

    setCrosshair({
      x: xScale(d.date) ?? 0,
      y: yScale(d.price) ?? 0,
      date: d.date,
      price: d.price,
      volume: d.volume,
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
          <h3 className="text-xl font-semibold text-gray-800">
            ${stockData.symbol}
          </h3>
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
                  fillOpacity={0.15}
                />
              );
            })}

            <AxisBottom
              top={innerHeight}
              scale={xScale}
              tickFormat={(value) => formatMarketDate(value as Date, 'short')}
              stroke="#6b7280"
              tickStroke="#6b7280"
              numTicks={8}
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
              strokeOpacity={0.7}
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
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-4">
        <TimeRangeSelector />
      </div>
    </div>
  );
}