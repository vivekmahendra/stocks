import React from "react";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import type { RepurchaseData } from "../services/repurchases";

interface RepurchaseHistogramProps {
  data: RepurchaseData[];
}

const margin = { top: 20, right: 40, bottom: 60, left: 80 };
const defaultWidth = 800;
const defaultHeight = 300;

export function RepurchaseHistogram({ data }: RepurchaseHistogramProps) {
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

  const width = defaultWidth;
  const height = defaultHeight;
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          Share Repurchases
        </h3>
        <p className="text-sm text-gray-600">
          Quarterly buyback activity (in billions USD)
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg width={width} height={height} className="min-w-full">
          <Group left={margin.left} top={margin.top}>
            {/* Bars */}
            {chartData.map((d, i) => {
              const barHeight = innerHeight - yScale(d.displayValue);
              return (
                <Bar
                  key={`bar-${i}`}
                  x={xScale(d.label)}
                  y={yScale(d.displayValue)}
                  width={xScale.bandwidth()}
                  height={barHeight}
                  fill="#6b7280"
                  opacity={0.8}
                  className="hover:opacity-100 transition-opacity"
                />
              );
            })}

            {/* Y Axis */}
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

            {/* X Axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              stroke="#6b7280"
              tickStroke="#6b7280"
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
      </div>
    </div>
  );
}
