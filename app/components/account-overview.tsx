import type { AlpacaAccount } from '../types/stock';

interface AccountOverviewProps {
  account: AlpacaAccount;
  totalPL: number;
  totalPLPercent: number;
  dayPL: number;
  dayPLPercent: number;
  isPaper: boolean;
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

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function AccountOverview({ account, totalPL, totalPLPercent, dayPL, dayPLPercent, isPaper }: AccountOverviewProps) {
  const portfolioValue = parseFloat(account.portfolio_value);
  const buyingPower = parseFloat(account.buying_power);
  const cash = parseFloat(account.cash);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Account Overview</h2>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            account.status === 'ACTIVE' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {account.status}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isPaper 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isPaper ? 'PAPER' : 'LIVE'}
          </span>
          {account.pattern_day_trader && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              PDT
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Portfolio Value */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Portfolio Value</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(portfolioValue)}
          </div>
          <div className="mt-1 flex items-center justify-center space-x-2">
            <span className={`text-sm font-medium ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPL)}
            </span>
            <span className={`text-xs ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({formatPercent(totalPLPercent)})
            </span>
          </div>
        </div>

        {/* Buying Power */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Buying Power</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(buyingPower)}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Cash: {formatCurrency(cash)}
          </div>
        </div>

        {/* Day P/L */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Day P/L</div>
          <div className={`text-2xl font-bold ${dayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(dayPL)}
          </div>
          <div className={`mt-1 text-sm ${dayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(dayPLPercent)}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap justify-center items-center gap-4 text-xs text-gray-500">
          <span>Account: {account.account_number}</span>
          <span>•</span>
          <span>Multiplier: {account.multiplier}x</span>
          <span>•</span>
          <span>Day Trades: {account.daytrade_count}/3</span>
        </div>
      </div>
    </div>
  );
}