import type { AlpacaOrder } from '../types/stock';

interface OpenOrdersProps {
  orders: AlpacaOrder[];
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

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'BUY':
      return 'text-green-600 bg-green-100';
    case 'SELL':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'NEW':
    case 'ACCEPTED':
      return 'text-blue-600 bg-blue-100';
    case 'PARTIALLY_FILLED':
      return 'text-yellow-600 bg-yellow-100';
    case 'FILLED':
      return 'text-green-600 bg-green-100';
    case 'CANCELED':
    case 'EXPIRED':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function OpenOrders({ orders }: OpenOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Open Orders</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2a1 1 0 00-2 0v2H8V2a1 1 0 00-2 0v2H5a3 3 0 00-3 3v12a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zM4 7a1 1 0 011-1h14a1 1 0 011 1v2H4V7zm16 12a1 1 0 01-1 1H5a1 1 0 01-1-1v-8h16v8z"/>
          </svg>
          <p className="text-gray-500">No open orders</p>
          <p className="text-sm text-gray-400 mt-1">Your pending orders will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Open Orders</h3>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      <div className="space-y-3">
        {orders.slice(0, 5).map((order) => (
          <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">{order.symbol}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getOrderTypeColor(order.side)}`}>
                  {order.side}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {order.qty} shares @ {order.limit_price ? formatCurrency(order.limit_price) : 'Market'}
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(order.submitted_at)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                {order.notional ? formatCurrency(order.notional) : 
                 (order.qty && order.limit_price ? formatCurrency(parseFloat(order.qty) * parseFloat(order.limit_price)) : 'Market')}
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {order.order_type} {order.time_in_force}
              </div>
            </div>
          </div>
        ))}
        
        {orders.length > 5 && (
          <div className="text-center pt-2">
            <span className="text-sm text-gray-500">
              +{orders.length - 5} more orders
            </span>
          </div>
        )}
      </div>
    </div>
  );
}