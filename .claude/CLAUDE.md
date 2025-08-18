# Stocks Dashboard Project

## Project Overview
A web-based stocks dashboard for tracking, monitoring, and researching investments. The application features real-time stock data visualization with intelligent caching and dynamic watchlist management.

## Technology Stack
- **Framework**: React Router v7 with TypeScript
- **Styling**: TailwindCSS v4.1.12
- **Charts**: @visx library for stock price visualization
- **Database**: Supabase (PostgreSQL)
- **API**: Alpaca Markets API for stock data
- **Build Tool**: Vite
- **Caching**: Supabase-based intelligent caching system

## Current Architecture

### Database Schema (Supabase)

#### `stock_bars` Table
Stores cached historical stock price data:
```sql
- id: BIGSERIAL PRIMARY KEY
- symbol: VARCHAR(10) NOT NULL
- timestamp: TIMESTAMPTZ NOT NULL
- open_price: DECIMAL(10, 2) NOT NULL
- high_price: DECIMAL(10, 2) NOT NULL
- low_price: DECIMAL(10, 2) NOT NULL
- close_price: DECIMAL(10, 2) NOT NULL
- volume: BIGINT NOT NULL
- timeframe: VARCHAR(20) DEFAULT '1Day'
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()
```

#### `watchlist` Table
Manages user's tracked symbols with metadata:
```sql
- id: BIGSERIAL PRIMARY KEY
- symbol: VARCHAR(10) NOT NULL UNIQUE
- name: VARCHAR(100) (company name)
- added_date: TIMESTAMPTZ DEFAULT NOW()
- is_active: BOOLEAN DEFAULT TRUE
- sort_order: INTEGER DEFAULT 0
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()
```

#### `active_watchlist` View
Provides filtered view of active watchlist symbols ordered by sort_order and added_date.

### Application Structure

#### Core Services

**`app/services/stock-cache.ts`** - StockCacheService
- Intelligent caching layer that checks Supabase before hitting Alpaca API
- Handles cache hits/misses with fallback to API
- Batches API requests with pagination support
- Implements data merging and deduplication
- Cache statistics and management functions

**`app/services/watchlist.ts`** - WatchlistService
- CRUD operations for watchlist management
- Symbol ordering and activation/deactivation
- Watchlist statistics and analytics
- Fallback to hardcoded symbols if database fails

**`app/lib/alpaca-api.ts`** - AlpacaAPI
- Direct integration with Alpaca Markets API
- Handles pagination for large data sets
- Batch and individual symbol requests
- Error handling and retry logic

**`app/lib/supabase.ts`** - Database clients
- Configured Supabase clients (admin and public)
- Service role for server-side operations
- Anonymous key for public operations

#### UI Components

**`app/routes/home.tsx`** - Main dashboard route
- Loads symbols from watchlist service
- Integrates with stock cache service
- Displays cache/API load statistics
- Handles add ticker form submissions
- Maps stock data to chart components

**`app/components/stock-chart.tsx`** - Individual stock card
- @visx-powered line charts with price data
- Real-time price change calculations
- Watchlist metadata display (added date, performance since added)
- Responsive design with auto-sizing
- Color-coded gains/losses with gray background highlights

**`app/components/add-ticker.tsx`** - Inline ticker addition
- Expandable form interface (no modal popup)
- Input validation and symbol formatting
- Form submission with loading states
- Clean, non-intrusive UI design

#### Type Definitions

**`app/types/database.ts`** - Supabase type definitions
- Generated types for all database tables
- Row/Insert/Update interfaces for type safety
- View definitions and relationships

**`app/types/stock.ts`** - Stock data interfaces
- StockBar, StockData, AlpacaResponse types
- API response formatting structures

### Data Flow

1. **Page Load**: Home loader fetches active symbols from watchlist
2. **Cache Check**: StockCacheService checks Supabase for existing data
3. **API Fallback**: Missing data fetched from Alpaca API
4. **Data Storage**: New data cached in Supabase with upsert logic
5. **Rendering**: Charts display with watchlist metadata and performance tracking

### Caching Strategy

The application implements intelligent caching:
- **Cache First**: Always check Supabase before API calls
- **Gap Detection**: Identifies incomplete data ranges
- **Mixed Loading**: Combines cached and fresh data seamlessly
- **Performance Tracking**: Monitors cache hit rates and load times
- **Automatic Cleanup**: Prevents duplicate entries with unique constraints

### Environment Variables

Required environment variables:
```
ALPACA_API_KEY=your_api_key
ALPACA_SECRET_KEY=your_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Key Features Implemented

✅ **Dynamic Watchlist Management**
- Add/remove symbols via inline form
- Database-driven symbol loading
- Automatic sorting and metadata tracking

✅ **Intelligent Caching System**
- Supabase-based cache with 567+ records
- Mixed cache/API loading with performance indicators
- Automatic gap filling and data completion

✅ **Visual Stock Charts**
- @visx line charts with price history
- Responsive design with auto-sizing
- Color-coded performance indicators

✅ **Watchlist Performance Tracking**
- Added date display for each symbol
- Price change calculation since addition
- Gray-highlighted performance metrics

✅ **Real-time Load Indicators**
- Cache vs API load source indicators
- Load time tracking and statistics
- Visual feedback for data freshness

### Current Symbols in Watchlist
SPY, TSLA, AAPL, GOOG, DIS, LULU, UPS, UNH, AXP, MSFT

### Development Commands
- `npm run dev` - Start development server (runs on port 5173/5174)
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking

### Database Setup
1. Run `supabase_ddl.sql` to create stock_bars table
2. Run `watchlist_ddl.sql` to create watchlist system
3. Tables will be auto-seeded with current symbols

### Known Architecture Decisions

1. **Supabase over Redis**: Chosen for persistence and SQL capabilities
2. **Service-side caching**: Reduces API calls and improves performance
3. **@visx charts**: Provides fine-grained control over chart rendering
4. **Inline forms**: Maintains clean UI without modal overlays
5. **Mixed loading strategy**: Optimizes for both speed and data freshness

### Performance Characteristics
- **Cache hits**: Sub-second load times (~900-1200ms)
- **API calls**: 2-3 second load times with automatic caching
- **Data volume**: 630+ cached price bars across 10 symbols
- **Pagination**: Handles large datasets with 3-page API limits

### Future Development Notes
- Watchlist is database-driven and easily extensible
- Caching system can handle any number of symbols
- Chart component supports custom colors and timeframes
- Add ticker form can be enhanced with company name lookup
- Performance tracking can be extended with more metrics