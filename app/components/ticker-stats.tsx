import type { StockData } from '../types/stock';

interface TickerStatsProps {
  stockData: StockData;
}

interface StatCard {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

export function TickerStats({ stockData }: TickerStatsProps) {
  // Calculate basic stats from available data
  const bars = stockData.bars || [];
  const latestBar = bars[bars.length - 1];
  const previousBar = bars[bars.length - 2];
  
  const currentPrice = latestBar?.c || 0;
  const volume = latestBar?.v || 0;
  const dayChange = latestBar && previousBar ? latestBar.c - previousBar.c : 0;
  const dayChangePercent = previousBar ? (dayChange / previousBar.c) * 100 : 0;

  // Calculate period stats
  const high52Week = Math.max(...bars.map(b => b.h));
  const low52Week = Math.min(...bars.map(b => b.l));
  const avgVolume = bars.length > 0 ? bars.reduce((sum, b) => sum + b.v, 0) / bars.length : 0;

  // Mock data for external API placeholders (to be replaced with real data)
  const mockStats: StatCard[] = [
    {
      label: 'Market Cap',
      value: '$2.85T',
      description: 'Total market value',
    },
    {
      label: 'P/E Ratio',
      value: '28.5',
      change: '+2.1%',
      changeType: 'positive',
      description: 'Price to Earnings ratio',
    },
    {
      label: 'EPS',
      value: '$6.78',
      change: '+12.5%',
      changeType: 'positive',
      description: 'Earnings per share (TTM)',
    },
    {
      label: 'Dividend Yield',
      value: '0.52%',
      description: 'Annual dividend yield',
    },
    {
      label: 'Beta',
      value: '1.24',
      description: 'Stock volatility vs market',
    },
    {
      label: 'Revenue (TTM)',
      value: '$394.3B',
      change: '+8.2%',
      changeType: 'positive',
      description: 'Trailing twelve months',
    },
  ];

  // Current data stats
  const currentStats: StatCard[] = [
    {
      label: 'Current Price',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} (${dayChangePercent >= 0 ? '+' : ''}${dayChangePercent.toFixed(2)}%)`,
      changeType: dayChange >= 0 ? 'positive' : 'negative',
      description: 'Latest trading price',
    },
    {
      label: 'Volume',
      value: (volume / 1000000).toFixed(1) + 'M',
      description: 'Shares traded today',
    },
    {
      label: '52-Week High',
      value: `$${high52Week.toFixed(2)}`,
      description: 'Highest price in 52 weeks',
    },
    {
      label: '52-Week Low',
      value: `$${low52Week.toFixed(2)}`,
      description: 'Lowest price in 52 weeks',
    },
    {
      label: 'Avg Volume',
      value: (avgVolume / 1000000).toFixed(1) + 'M',
      description: 'Average daily volume',
    },
    {
      label: 'Data Points',
      value: bars.length,
      description: 'Trading days in dataset',
    },
  ];

  const renderStatCard = (stat: StatCard, index: number) => (
    <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-500 mb-1">{stat.label}</h4>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            {stat.change && (
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' 
                  ? 'text-green-600' 
                  : stat.changeType === 'negative' 
                  ? 'text-red-600' 
                  : 'text-gray-600'
              }`}>
                {stat.change}
              </span>
            )}
          </div>
          {stat.description && (
            <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
          )}
        </div>
        <div className="ml-2">
          <div className={`w-3 h-3 rounded-full ${
            stat.changeType === 'positive' 
              ? 'bg-green-400' 
              : stat.changeType === 'negative' 
              ? 'bg-red-400' 
              : 'bg-gray-300'
          }`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        {stockData.symbol} Statistics
      </h3>

      {/* Current Data Section */}
      <div className="mb-8">
        <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Current Data
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentStats.map((stat, index) => renderStatCard(stat, index))}
        </div>
      </div>

      {/* External API Data Section (Placeholders) */}
      <div>
        <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
          Financial Metrics
          <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
            Coming Soon
          </span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 opacity-75 relative overflow-hidden">
              {/* Placeholder overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-pulse"></div>
              <div className="relative">
                <h4 className="text-sm font-medium text-gray-500 mb-1">{stat.label}</h4>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-gray-400">{stat.value}</span>
                  {stat.change && (
                    <span className="text-sm font-medium text-gray-400">
                      {stat.change}
                    </span>
                  )}
                </div>
                {stat.description && (
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <div className="w-5 h-5 text-orange-500 mt-0.5 mr-3">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-medium text-orange-800">External Data Integration</h5>
              <p className="text-sm text-orange-700 mt-1">
                Financial metrics will be populated from external APIs (Alpha Vantage, Yahoo Finance, etc.) 
                to provide comprehensive fundamental and technical analysis data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}