import type { AlpacaAccount, AlpacaPosition, AlpacaOrder } from '../types/stock';

const ALPACA_PAPER_URL = 'https://paper-api.alpaca.markets/v2';
const ALPACA_LIVE_URL = 'https://api.alpaca.markets/v2';

export class AlpacaAccountService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  public readonly isPaper: boolean;

  constructor(apiKey: string, secretKey: string, isPaper = true) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.isPaper = isPaper;
    this.baseUrl = isPaper ? ALPACA_PAPER_URL : ALPACA_LIVE_URL;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🚀 Alpaca Account API Request: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': this.apiKey,
        'APCA-API-SECRET-KEY': this.secretKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Alpaca Account API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Alpaca API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Alpaca Account API Success: ${endpoint}`, data);
    return data;
  }

  async getAccount(): Promise<AlpacaAccount> {
    return this.makeRequest<AlpacaAccount>('/account');
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    return this.makeRequest<AlpacaPosition[]>('/positions');
  }

  async getOpenOrders(): Promise<AlpacaOrder[]> {
    return this.makeRequest<AlpacaOrder[]>('/orders?status=open');
  }

  async getAccountSummary(): Promise<{
    account: AlpacaAccount;
    positions: AlpacaPosition[];
    openOrders: AlpacaOrder[];
    totalPL: number;
    totalPLPercent: number;
    dayPL: number;
    dayPLPercent: number;
    isPaper: boolean;
  }> {
    try {
      console.log('🔄 Fetching account summary...');
      
      const [account, positions, openOrders] = await Promise.all([
        this.getAccount(),
        this.getPositions(),
        this.getOpenOrders(),
      ]);

      // Calculate total P/L
      const totalPL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl), 0);
      const totalCostBasis = positions.reduce((sum, pos) => sum + parseFloat(pos.cost_basis), 0);
      const totalPLPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

      // Calculate day P/L
      const dayPL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_intraday_pl), 0);
      const dayPLPercent = positions.reduce((sum, pos) => {
        const dayPlPercent = parseFloat(pos.unrealized_intraday_plpc) * 100;
        return sum + (isNaN(dayPlPercent) ? 0 : dayPlPercent);
      }, 0) / (positions.length || 1);

      console.log('✅ Account summary calculated:', {
        portfolioValue: account.portfolio_value,
        buyingPower: account.buying_power,
        totalPL: totalPL.toFixed(2),
        totalPLPercent: totalPLPercent.toFixed(2),
        positionsCount: positions.length,
        openOrdersCount: openOrders.length,
      });

      return {
        account,
        positions,
        openOrders,
        totalPL,
        totalPLPercent,
        dayPL,
        dayPLPercent,
        isPaper: this.isPaper,
      };
    } catch (error) {
      console.error('❌ Error fetching account summary:', error);
      throw error;
    }
  }
}

export function createAccountService(apiKey: string, secretKey: string, isPaper = true): AlpacaAccountService {
  return new AlpacaAccountService(apiKey, secretKey, isPaper);
}