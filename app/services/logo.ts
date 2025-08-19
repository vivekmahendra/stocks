const ALPACA_LOGO_URL = 'https://data.alpaca.markets/v1beta1/logos';

export class LogoService {
  private apiKey: string;
  private secretKey: string;
  private logoCache: Map<string, string | null> = new Map();

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  /**
   * Get company logo URL for a symbol
   */
  async getLogoUrl(symbol: string): Promise<string | null> {
    // Check cache first
    if (this.logoCache.has(symbol)) {
      return this.logoCache.get(symbol) || null;
    }

    try {
      const url = `${ALPACA_LOGO_URL}/${symbol.toUpperCase()}`;
      
      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
          'Accept': 'image/png',
        },
      });

      if (!response.ok) {
        console.log(`📷 Logo not found for ${symbol}: ${response.status}`);
        this.logoCache.set(symbol, null);
        return null;
      }

      // Convert the image response to a data URL
      const blob = await response.blob();
      const logoUrl = URL.createObjectURL(blob);
      
      // Cache the result
      this.logoCache.set(symbol, logoUrl);
      
      if (logoUrl) {
        console.log(`📷 Logo found for ${symbol}: ${logoUrl}`);
      } else {
        console.log(`📷 No logo URL in response for ${symbol}`);
      }
      
      return logoUrl;
    } catch (error) {
      console.error(`❌ Error fetching logo for ${symbol}:`, error);
      this.logoCache.set(symbol, null);
      return null;
    }
  }

  /**
   * Get multiple logos in parallel
   */
  async getLogos(symbols: string[]): Promise<Record<string, string | null>> {
    const logoPromises = symbols.map(async (symbol) => {
      const logoUrl = await this.getLogoUrl(symbol);
      return { symbol, logoUrl };
    });

    const results = await Promise.all(logoPromises);
    
    const logoMap: Record<string, string | null> = {};
    results.forEach(({ symbol, logoUrl }) => {
      logoMap[symbol] = logoUrl;
    });

    return logoMap;
  }

  /**
   * Clear the logo cache
   */
  clearCache(): void {
    this.logoCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; symbols: string[] } {
    return {
      size: this.logoCache.size,
      symbols: Array.from(this.logoCache.keys()),
    };
  }
}

// Factory function to create logo service
export function createLogoService(): LogoService | null {
  // Temporarily disable logo service - uncomment when subscription supports logos
  console.log('📷 Logo service disabled (subscription tier limitation)');
  return null;

  // Uncomment below when logos are supported:
  /*
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.warn('⚠️ Alpaca API credentials not found, logo service disabled');
    return null;
  }

  return new LogoService(apiKey, secretKey);
  */
}

// Singleton instance
let logoServiceInstance: LogoService | null = null;

export function getLogoService(): LogoService | null {
  if (!logoServiceInstance) {
    logoServiceInstance = createLogoService();
  }
  return logoServiceInstance;
}