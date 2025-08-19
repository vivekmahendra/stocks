import { Link } from "react-router";
import { useState, useEffect } from "react";
import { getMarketStatus, getMarketStatusText } from "../services/market-status";
import type { MarketStatus } from "../services/market-status";

export function Navbar() {
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

  useEffect(() => {
    const updateMarketStatus = () => {
      setMarketStatus(getMarketStatus());
    };
    
    // Update immediately
    updateMarketStatus();
    
    // Update every minute
    const interval = setInterval(updateMarketStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="relative">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-lg font-light text-gray-900 tracking-wide">stocks.vivekmahendra</h1>
            </Link>
            
            <div className="hidden sm:flex items-center space-x-6">
              <div className="flex items-center space-x-2 min-w-[120px]">
                {marketStatus ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${
                      marketStatus.isOpen ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs font-medium text-gray-600">
                      {getMarketStatusText(marketStatus)}
                    </span>
                  </>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-300 opacity-50"></div>
                )}
              </div>
              <Link 
                to="/" 
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Market Status Glow Bar */}
      <div 
        className={`h-0.5 w-full transition-all duration-1000 ${
          marketStatus?.isOpen
            ? 'bg-gradient-to-r from-green-400 via-green-500 to-green-400 shadow-lg shadow-green-500/40'
            : marketStatus
            ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-400 shadow-lg shadow-red-500/30'
            : 'bg-gray-200'
        }`}
        style={{
          filter: marketStatus?.isOpen 
            ? 'drop-shadow(0 4px 8px rgba(34, 197, 94, 0.3))' 
            : marketStatus
            ? 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.2))'
            : 'none'
        }}
      />
    </div>
  );
}