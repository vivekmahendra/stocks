import React, { useEffect, useRef, useState } from "react";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import { extent } from 'd3-array';
import type { RepurchaseData } from "../services/repurchases";
import type { FinancialRatios } from "../services/financial-ratios";

interface RepurchaseHistogramProps {
  data: RepurchaseData[];
  ratiosData?: FinancialRatios[];
}

const margin = { top: 20, right: 80, bottom: 60, left: 80 }; // Increased right margin for P/B axis
const defaultHeight = 300;

export function RepurchaseHistogram({ data, ratiosData = [] }: RepurchaseHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: defaultHeight });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    repurchaseValue: number;
    pbRatio?: number;
    date: string;
    period: string;
    fiscalYear: number;
    visible: boolean;
  } | null>(null);
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Share Repurchases
        </h3>
        <div className="h-32 flex items-center justify-center text-gray-500">
          <p>No repurchase data available</p>
        </div>
      </div>
    );
  }

  // Responsive width calculation
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerPadding = 48; // Account for container padding
        setDimensions({
          width: Math.max(400, rect.width - containerPadding),
          height: defaultHeight,
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

  const { width, height } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Filter out null/zero values and unrealistic large values, convert to positive billions for display
  const chartData = data
    .filter((d) => {
      if (!d.common_stock_repurchased || d.common_stock_repurchased === 0)
        return false;
      const billions = Math.abs(d.common_stock_repurchased) / 1000000000;
      // Filter out unrealistic values > $10B (Berkshire's largest quarterly repurchases are typically < $10B)
      return billions <= 10;
    })
    .map((d) => ({
      ...d,
      displayValue: Math.abs(d.common_stock_repurchased) / 1000000000, // Convert to billions
      label: `${d.period} ${d.fiscal_year}`,
      originalValue: d.common_stock_repurchased, // Keep original for debugging
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronologically

  // Process P/B ratio data to align with repurchase quarters
  // Only include P/B data that has matching repurchase data
  const pbData = ratiosData
    .filter(r => r.price_to_book_ratio !== null)
    .map(r => ({
      date: new Date(r.date),
      priceToBook: r.price_to_book_ratio!,
      label: `${r.period} ${r.fiscal_year}`,
    }))
    .filter(pbItem => chartData.some(chartItem => chartItem.label === pbItem.label))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Share Repurchases
        </h3>
        <div className="h-32 flex items-center justify-center text-gray-500">
          <p>No significant repurchase activity in this period</p>
        </div>
      </div>
    );
  }

  // Scales
  const xScale = scaleBand({
    range: [0, innerWidth],
    domain: chartData.map((d) => d.label),
    padding: 0.2,
  });

  const maxValue = Math.max(...chartData.map((d) => d.displayValue));
  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: [0, maxValue * 1.1], // Add 10% padding
    nice: true,
  });

  // P/B ratio scale for right Y-axis
  const pbExtent = pbData.length > 0 ? extent(pbData, d => d.priceToBook) as [number, number] : [0, 3];
  const pbScale = scaleLinear({
    range: [innerHeight, 0],
    domain: [Math.max(0, pbExtent[0] * 0.9), pbExtent[1] * 1.1], // Add padding, ensure minimum is 0
    nice: true,
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" ref={containerRef}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          Share Repurchases & Valuation
        </h3>
        <p className="text-sm text-gray-600">
          Quarterly buyback activity ($ billions) and price-to-book ratio
        </p>
      </div>

      {pbData.length > 0 && (
        <div className="flex justify-center mb-3">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-500 rounded-sm opacity-80"></div>
              <span className="text-gray-600">Repurchases ($B)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-black rounded-full"></div>
              <span className="text-black">Price-to-Book</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full relative">
        <svg width={width} height={height} className="w-full h-auto">
          <Group left={margin.left} top={margin.top}>
            {/* Bars */}
            {chartData.map((d, i) => {
              const barHeight = innerHeight - yScale(d.displayValue);
              const barX = xScale(d.label) || 0;
              const barY = yScale(d.displayValue) || 0;
              
              // Find matching P/B ratio for this quarter
              const matchingPB = pbData.find(pb => pb.label === d.label);
              
              return (
                <Bar
                  key={`bar-${i}`}
                  x={barX}
                  y={barY}
                  width={xScale.bandwidth()}
                  height={barHeight}
                  fill="#6b7280"
                  opacity={0.8}
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                  onMouseEnter={() => {
                    setTooltip({
                      x: barX + (xScale.bandwidth() / 2), // Center of the bar
                      y: innerHeight / 2, // Middle of chart area
                      repurchaseValue: d.displayValue,
                      pbRatio: matchingPB?.priceToBook,
                      date: d.date,
                      period: d.period,
                      fiscalYear: d.fiscal_year,
                      visible: true,
                    });
                  }}
                  onMouseLeave={() => {
                    setTooltip(null);
                  }}
                />
              );
            })}

            {/* P/B Ratio Line - using simple line segments instead of curve */}
            {pbData.length > 1 && pbData.map((d, i) => {
              if (i === 0) return null;
              const prevD = pbData[i - 1];
              const x1 = (xScale(prevD.label) ?? 0) + (xScale.bandwidth() / 2);
              const y1 = pbScale(prevD.priceToBook) ?? 0;
              const x2 = (xScale(d.label) ?? 0) + (xScale.bandwidth() / 2);
              const y2 = pbScale(d.priceToBook) ?? 0;
              
              return (
                <line
                  key={`pb-line-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#000000"
                  strokeWidth={3}
                />
              );
            })}

            {/* P/B Data Points */}
            {pbData.map((d, i) => {
              const xPos = (xScale(d.label) ?? 0) + (xScale.bandwidth() / 2);
              return (
                <circle
                  key={`pb-point-${i}`}
                  cx={xPos}
                  cy={pbScale(d.priceToBook)}
                  r={4}
                  fill="#000000"
                  stroke="white"
                  strokeWidth={1}
                />
              );
            })}

            {/* Left Y Axis - Repurchases */}
            <AxisLeft
              scale={yScale}
              tickFormat={(value) => `$${Number(value).toFixed(1)}B`}
              stroke="#6b7280"
              tickStroke="#6b7280"
              numTicks={6}
              tickLabelProps={() => ({
                fill: "#6b7280",
                fontSize: 11,
                textAnchor: "end",
                dx: -5,
              })}
            />

            {/* Right Y Axis - P/B Ratio */}
            {pbData.length > 0 && (
              <AxisRight
                left={innerWidth}
                scale={pbScale}
                tickFormat={(value) => `${Number(value).toFixed(1)}x`}
                stroke="#000000"
                tickStroke="#000000"
                numTicks={6}
                tickLabelProps={() => ({
                  fill: "#000000",
                  fontSize: 11,
                  textAnchor: "start",
                  dx: 5,
                })}
              />
            )}

            {/* X Axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              stroke="#6b7280"
              tickStroke="#6b7280"
              numTicks={Math.min(chartData.length, 12)} // Limit to max 12 ticks for readability
              tickLabelProps={() => ({
                fill: "#6b7280",
                fontSize: 10,
                textAnchor: "middle",
                angle: -45,
                dx: -10,
                dy: 5,
              })}
            />
          </Group>
        </svg>
        
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
            style={{
              left: tooltip.x + margin.left,
              top: tooltip.y + margin.top,
              transform: 'translate(-50%, -50%)', // Center the tooltip on the position
            }}
          >
            <div className="space-y-1">
              <div className="font-medium">
                {tooltip.period} {tooltip.fiscalYear}
              </div>
              <div className="text-xs text-gray-300">
                {new Date(tooltip.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric', 
                  year: 'numeric'
                })}
              </div>
              <div className="text-blue-400 font-medium">
                Repurchases: ${tooltip.repurchaseValue.toFixed(1)}B
              </div>
              {tooltip.pbRatio && (
                <div className="text-green-400 font-medium">
                  P/B Ratio: {tooltip.pbRatio.toFixed(2)}x
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
