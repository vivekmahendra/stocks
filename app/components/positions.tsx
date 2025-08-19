import type { AlpacaPosition } from '../types/stock';

interface PositionsProps {
  positions: AlpacaPosition[];
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatPercent(value: string): string {
  const num = parseFloat(value) * 100;
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function formatShares(value: string): string {
  const num = parseFloat(value);
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}

export function Positions({ positions }: PositionsProps) {
  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Positions</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
          <p className="text-gray-500">No positions</p>
          <p className="text-sm text-gray-400 mt-1">Your stock positions will appear here</p>
        </div>
      </div>
    );
  }

  // Sort positions by market value (highest first)
  const sortedPositions = [...positions].sort((a, b) => 
    Math.abs(parseFloat(b.market_value)) - Math.abs(parseFloat(a.market_value))
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Positions</h3>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {positions.length} {positions.length === 1 ? 'position' : 'positions'}
        </span>
      </div>

      <div className="space-y-3">
        {sortedPositions.slice(0, 6).map((position) => {
          const unrealizedPL = parseFloat(position.unrealized_pl);
          const unrealizedPLPercent = parseFloat(position.unrealized_plpc);
          const dayPL = parseFloat(position.unrealized_intraday_pl);
          const dayPLPercent = parseFloat(position.unrealized_intraday_plpc);
          const marketValue = parseFloat(position.market_value);
          const isShort = position.side === 'short';

          return (
            <div key={position.asset_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">{position.symbol}</span>
                  {isShort && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                      SHORT
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {formatShares(position.qty)} shares @ {formatCurrency(position.avg_entry_price)}
                </div>
                <div className="text-sm text-gray-600">
                  Current: {formatCurrency(position.current_price)}
                </div>
              </div>
              
              <div className="text-right space-y-1">
                {/* Market Value */}
                <div className="font-medium text-gray-900">
                  {formatCurrency(Math.abs(marketValue))}
                </div>
                
                {/* Total P/L */}
                <div className={`text-sm ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(unrealizedPL)} ({formatPercent(position.unrealized_plpc)})
                </div>
                
                {/* Day P/L */}
                <div className={`text-xs ${dayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Day: {formatCurrency(dayPL)} ({formatPercent(position.unrealized_intraday_plpc)})
                </div>
              </div>
            </div>
          );
        })}
        
        {positions.length > 6 && (
          <div className="text-center pt-2">
            <span className="text-sm text-gray-500">
              +{positions.length - 6} more positions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}