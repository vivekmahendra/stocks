# Stocks Dashboard

A comprehensive web application for tracking, monitoring, and researching investments. Live at [stocks.vivekmahendra.com](https://stocks.vivekmahendra.com).

## Features

- 📊 Real-time portfolio tracking and performance metrics
- 📈 Interactive charts and technical analysis tools
- 💹 Market overview with major indices and trends
- 📰 Latest financial news and market updates
- 🔍 Stock research and screening capabilities
- 📱 Responsive design for desktop and mobile
- 🚀 Built with React Router, TypeScript, and TailwindCSS
- 🔄 Paper trading integration (coming soon with Alpaca API)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Alpaca API Configuration (for paper trading)
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_api_secret_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Additional API Keys
# Add other financial data API keys as needed
```

## Deployment

The application is deployed at [stocks.vivekmahendra.com](https://stocks.vivekmahendra.com).

### Docker Deployment

```bash
docker build -t stocks-dashboard .
docker run -p 3000:3000 stocks-dashboard
```

### Production Build

```bash
npm run build
npm run start
```

## Tech Stack

- **Frontend Framework**: React with React Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Charts**: Recharts (to be added)
- **API Integration**: Alpaca API for paper trading
- **Build Tool**: Vite
- **Deployment**: Docker-ready

## Roadmap

- [x] Initial project setup
- [ ] Dashboard layout and navigation
- [ ] Portfolio tracking functionality
- [ ] Stock watchlist feature
- [ ] Real-time price updates
- [ ] Alpaca API integration
- [ ] Paper trading interface
- [ ] Advanced charting tools
- [ ] News feed integration
- [ ] Mobile app version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Private project - All rights reserved

---

Built with React Router and optimized for investment tracking.
