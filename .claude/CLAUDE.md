# Stocks Dashboard Project

## Project Overview
A web-based stocks dashboard for tracking, monitoring, and researching investments. The application will be deployed at stocks.vivekmahendra.com.

## Technology Stack
- **Framework**: React Router with TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Deployment Target**: stocks.vivekmahendra.com
- **Future Integrations**: Alpaca API for paper trading

## Project Goals
1. **Track Investments**: Monitor portfolio performance and individual stock positions
2. **Research Tools**: Provide market analysis and stock research capabilities
3. **Paper Trading**: Integrate with Alpaca API for simulated trading
4. **Real-time Data**: Display live market data and price updates
5. **Portfolio Analytics**: Show performance metrics, gains/losses, and portfolio allocation

## Development Guidelines
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Implement responsive design for mobile and desktop
- Ensure secure handling of API keys and sensitive data
- Write clean, maintainable code with proper error handling

## Key Features to Implement
- Portfolio dashboard with holdings overview
- Watchlist for tracking stocks of interest
- Market summary with major indices
- Individual stock detail pages
- Trading interface (paper trading via Alpaca)
- Performance charts and analytics
- News feed and market updates
- Portfolio allocation visualization

## API Integrations
- **Alpaca API**: For paper trading and market data
- **Financial Data APIs**: For real-time quotes and historical data
- **News APIs**: For market news and company updates

## Security Considerations
- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Implement proper authentication for user data
- Secure API endpoints and validate inputs

## Testing Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking