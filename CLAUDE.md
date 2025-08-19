# Stock Dashboard - Claude Code Documentation

## Project Overview
A real-time stock dashboard built with React Router v7, Supabase, and Alpaca Markets API. Features include stock price visualization, watchlist management, detailed ticker analysis, and note-taking functionality.

## Key Features
- Real-time stock data via Alpaca Markets API
- Intelligent caching system with Supabase PostgreSQL
- Interactive charts using @visx library
- Ticker detail pages with enhanced analytics
- Note-taking system for investment research
- Time range filtering (1D, 1W, 1M, 3M, 6M, 1Y, 2Y)
- Company logo integration (currently disabled)

## Architecture

### Tech Stack
- **Frontend**: React Router v7, TypeScript, Tailwind CSS
- **Charts**: @visx (D3-based charting library)
- **Backend**: Supabase PostgreSQL
- **APIs**: Alpaca Markets (stock data + logos)
- **Build**: Vite

### Database Schema
- `watchlist`: User's tracked symbols with metadata
- `stock_cache`: Cached price data to reduce API calls
- `ticker_notes`: User notes and research on individual stocks

### Services Architecture
- `stock-cache.ts`: Intelligent caching layer for API data
- `watchlist.ts`: Watchlist CRUD operations
- `notes.ts`: Notes management with full CRUD
- `logo.ts`: Company logo fetching (currently disabled)

## Company Logos (Currently Disabled)

### Status: DISABLED
The company logo functionality is temporarily disabled due to Alpaca API subscription tier limitations.

### How Logos Work
- **API Endpoint**: `https://data.alpaca.markets/v1beta1/logos/{symbol}`
- **Response**: Returns PNG image data directly (not JSON)
- **Authentication**: Requires APCA-API-KEY-ID and APCA-API-SECRET-KEY headers
- **Implementation**: Converts blob response to object URL for browser display

### Re-enabling Logos
When subscription tier supports logos:

1. **Enable the service** in `/app/services/logo.ts`:
   ```typescript
   // Comment out line 100-101, uncomment lines 104-114
   export function createLogoService(): LogoService | null {
     const apiKey = process.env.ALPACA_API_KEY;
     const secretKey = process.env.ALPACA_SECRET_KEY;
     // ... rest of implementation
   }
   ```

2. **Components ready**: All logo components handle null gracefully:
   - `CompanyLogo`: Shows letter placeholders when logoUrl is null
   - `StockChart`: Displays logos next to ticker symbols
   - `TickerDetailChart`: Shows logos in chart headers

3. **No other changes needed**: The entire logo system will activate automatically

### Logo Component Features
- Multiple sizes: sm (16px), md (24px), lg (32px)
- Fallback to company initials with gradient background
- Loading states and error handling
- Caching for performance
- Responsive design

## Development Commands

### Essential Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run typecheck    # TypeScript validation
```

### Database Operations
- Run DDL files in Supabase SQL editor when adding new tables
- Cache debugging: `node debug-cache.js`

## File Structure

### Core Routes
- `/app/routes/home.tsx`: Dashboard with stock cards grid
- `/app/routes/ticker.symbol.tsx`: Detailed ticker analysis page

### Components
- `stock-chart.tsx`: Compact chart cards for dashboard
- `ticker-detail-chart.tsx`: Enhanced chart for detail pages
- `ticker-notes.tsx`: Full CRUD interface for notes with elegant UI
- `company-logo.tsx`: Logo display with fallbacks
- `ui/select.tsx`: Custom dropdown component (shadcn-style)

### Services
- Smart caching with date range optimization
- Parallel data fetching for performance
- Comprehensive error handling and logging

## Known Issues & Solutions

### Cache Date Range Bug (RESOLVED)
- **Issue**: Only 3 months of data cached regardless of time range
- **Root Cause**: Alpaca API service ignored startDate/endDate parameters
- **Fix**: Updated `getStockBars()` to accept and use actual date ranges

### Route Configuration (RESOLVED)
- **Issue**: Dollar sign in filename caused build failures
- **Fix**: Renamed `ticker.$symbol.tsx` to `ticker.symbol.tsx`

## Future Enhancements
- AI insights integration with LLM
- External API integration for fundamental data
- Advanced charting indicators
- Portfolio tracking
- Real-time WebSocket updates
- Export functionality for notes and data

## Environment Variables Required
```bash
ALPACA_API_KEY=your_alpaca_key
ALPACA_SECRET_KEY=your_alpaca_secret
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```