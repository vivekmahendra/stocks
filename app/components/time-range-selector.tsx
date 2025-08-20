import { useSearchParams } from "react-router";
import { getMarketTime } from "../lib/market-time";

interface TimeRange {
  label: string;
  value: string;
  days?: number;
  months?: number;
}

const timeRanges: TimeRange[] = [
  { label: "1D", value: "1D", days: 1 },
  { label: "1W", value: "1W", days: 7 },
  { label: "1mo", value: "1M", months: 1 },
  { label: "3mo", value: "3M", months: 3 },
  { label: "6mo", value: "6M", months: 6 },
  { label: "1yr", value: "1Y", months: 12 },
  { label: "2yr", value: "2Y", months: 24 },
  { label: "5yr", value: "5Y", months: 60 },
];

export function TimeRangeSelector() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRange = searchParams.get("range") || "3M";

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

export function getDateRangeFromParam(rangeParam: string | null): { startDate: Date; endDate: Date } {
  const endDate = getMarketTime(); // Use market time instead of system time
  const startDate = new Date(endDate);
  
  const range = timeRanges.find(r => r.value === rangeParam) || timeRanges.find(r => r.value === "3M")!;
  
  if (range.days) {
    startDate.setDate(startDate.getDate() - range.days);
  } else if (range.months) {
    startDate.setMonth(startDate.getMonth() - range.months);
  }
  
  return { startDate, endDate };
}