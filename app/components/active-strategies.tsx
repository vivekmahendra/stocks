interface Strategy {
  id: string;
  name: string;
  symbol: string;
  type: 'long' | 'short' | 'neutral';
  status: 'active' | 'paused' | 'stopped';
  entry_price?: number;
  current_pl?: number;
  created_at: string;
}

interface ActiveStrategiesProps {
  strategies: Strategy[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStrategyTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'long':
      return 'text-green-600 bg-green-100';
    case 'short':
      return 'text-red-600 bg-red-100';
    case 'neutral':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'paused':
      return 'text-yellow-600 bg-yellow-100';
    case 'stopped':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function ActiveStrategies({ strategies }: ActiveStrategiesProps) {
  if (strategies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Strategies</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p className="text-gray-500">No active strategies</p>
          <p className="text-sm text-gray-400 mt-1">Your trading strategies will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Strategies</h3>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'}
        </span>
      </div>

      <div className="space-y-3">
        {strategies.slice(0, 5).map((strategy) => (
          <div key={strategy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">{strategy.name}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStrategyTypeColor(strategy.type)}`}>
                  {strategy.type.toUpperCase()}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(strategy.status)}`}>
                  {strategy.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {strategy.symbol} {strategy.entry_price && `@ ${formatCurrency(strategy.entry_price)}`}
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(strategy.created_at)}
              </div>
            </div>
            <div className="text-right">
              {strategy.current_pl !== undefined && (
                <div className={`font-medium ${strategy.current_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {strategy.current_pl >= 0 ? '+' : ''}{formatCurrency(strategy.current_pl)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {strategies.length > 5 && (
          <div className="text-center pt-2">
            <span className="text-sm text-gray-500">
              +{strategies.length - 5} more strategies
            </span>
          </div>
        )}
      </div>
    </div>
  );
}