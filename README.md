# Stocks Dashboard

A comprehensive web application for tracking, monitoring, and researching investments with intelligent caching and dynamic watchlist management.

## ✨ Features

### 🎯 **Currently Implemented**
- ✅ **Dynamic Watchlist Management** - Add/remove stocks with inline form
- ✅ **Intelligent Caching System** - Supabase-powered cache reduces API calls
- ✅ **Interactive Stock Charts** - @visx-powered price visualization
- ✅ **Performance Tracking** - Shows gains/losses since you added each stock
- ✅ **Real-time Load Indicators** - Visual feedback for cache vs API loading
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile

### 🚧 **Coming Soon**
- 📊 Portfolio tracking and allocation
- 📰 Financial news integration
- 💹 Market indices overview
- 🔄 Paper trading with Alpaca API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Alpaca Markets API account

### Installation

1. **Clone and install dependencies:**
```bash
git clone [repository-url]
cd stocks
npm install
```

2. **Environment Setup:**
Create `.env` file with:
```bash
# Alpaca API Configuration
ALPACA_API_KEY=your_api_key_here
ALPACA_SECRET_KEY=your_secret_key_here
ALPACA_ENDPOINT=https://paper-api.alpaca.markets/v2

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. **Database Setup:**
Run the SQL files in your Supabase dashboard:
```bash
# First create the cache table
supabase_ddl.sql

# Then create the watchlist system
watchlist_ddl.sql
```

4. **Start Development Server:**
```bash
npm run dev
```
Visit `http://localhost:5173`

## 🏗️ Architecture

### **Tech Stack**
- **Framework**: React Router v7 with TypeScript
- **Styling**: TailwindCSS v4.1.12
- **Charts**: @visx library for advanced visualizations
- **Database**: Supabase (PostgreSQL)
- **API**: Alpaca Markets for stock data
- **Build**: Vite with HMR

### **Key Components**
- **StockCacheService**: Intelligent cache-first data loading
- **WatchlistService**: Dynamic symbol management with metadata
- **StockChart**: Interactive price charts with performance tracking
- **AddTicker**: Inline form for seamless symbol addition

### **Database Schema**
```sql
stock_bars        # Cached price data (630+ records)
├── symbol, timestamp, prices, volume
└── Unique constraint prevents duplicates

watchlist         # User's tracked symbols
├── symbol, added_date, sort_order
└── Active view for quick filtering
```

## 📊 Current Performance

- **⚡ Cache Hits**: ~900-1200ms load time
- **🌐 API Calls**: ~2-3s with automatic caching
- **📈 Data Volume**: 630+ cached price bars
- **🎯 Symbols**: 10 active (SPY, TSLA, AAPL, GOOG, DIS, LULU, UPS, UNH, AXP, MSFT)

## 🛠️ Development

### **Available Commands**
```bash
npm run dev        # Start development server
npm run build      # Production build
npm run typecheck  # TypeScript validation
```

### **Project Structure**
```
app/
├── components/     # UI components
│   ├── stock-chart.tsx    # Individual stock cards
│   └── add-ticker.tsx     # Inline ticker form
├── services/       # Business logic
│   ├── stock-cache.ts     # Intelligent caching
│   └── watchlist.ts       # Symbol management
├── lib/           # External integrations
│   ├── supabase.ts        # Database client
│   └── alpaca-api.ts      # Stock data API
└── types/         # TypeScript definitions
    ├── database.ts        # Supabase types
    └── stock.ts          # API interfaces
```

## 🔄 Data Flow

1. **Page Load** → Fetch active symbols from watchlist
2. **Cache Check** → Query Supabase for existing data
3. **API Fallback** → Fetch missing data from Alpaca
4. **Smart Caching** → Store new data with upsert logic
5. **Rendering** → Display charts with performance metrics

## 🎨 UI Features

### **Stock Cards**
- Real-time price charts with @visx
- Color-coded gains/losses
- Added date and performance since addition
- Gray-highlighted metrics section

### **Watchlist Management**
- Inline "Add Ticker" button
- Expandable form (no modal popups)
- Automatic symbol validation
- Instant cache/API integration

### **Performance Indicators**
- Green/blue badges for cache vs API loading
- Load time tracking
- Cache statistics display
- Visual feedback for data freshness

## 📈 Roadmap

### **Phase 1** ✅ **Complete**
- [x] Dynamic watchlist with database persistence
- [x] Intelligent caching system
- [x] Interactive stock charts
- [x] Performance tracking since addition
- [x] Real-time load indicators

### **Phase 2** 🚧 **In Progress**
- [ ] Portfolio allocation tracking
- [ ] News feed integration
- [ ] Market indices dashboard
- [ ] Advanced chart timeframes

### **Phase 3** 📋 **Planned**
- [ ] Paper trading integration
- [ ] Mobile app version
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

Private project - All rights reserved

---

**Built with React Router, TypeScript, and ❤️ for intelligent stock tracking.**
