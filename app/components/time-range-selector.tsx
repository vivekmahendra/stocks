import { useSearchParams } from "react-router";

interface TimeRange {
  label: string;
  value: string;
  months: number;
}

const timeRanges: TimeRange[] = [
  { label: "1 Month", value: "1M", months: 1 },
  { label: "3 Months", value: "3M", months: 3 },
  { label: "6 Months", value: "6M", months: 6 },
  { label: "1 Year", value: "1Y", months: 12 },
  { label: "2 Years", value: "2Y", months: 24 },
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
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Time Range:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => handleRangeChange(range.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentRange === range.value
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getDateRangeFromParam(rangeParam: string | null): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  
  const range = timeRanges.find(r => r.value === rangeParam) || timeRanges[1]; // Default to 3M
  startDate.setMonth(startDate.getMonth() - range.months);
  
  return { startDate, endDate };
}