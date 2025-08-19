import { supabase } from '../lib/supabase';
import { createGrokService } from './grok';

interface CompanyNarrativeCache {
  id: string;
  symbol: string;
  narrative: string;
  created_at: string;
  expires_at: string;
}

export function generateCompanyNarrativePrompt(symbol: string, companyName?: string): string {
  const company = companyName ? `${companyName} (${symbol})` : symbol;
  
  return `Provide a comprehensive market narrative for ${company} that includes:

1. Current market sentiment and recent price action
2. Key factors driving the stock's performance
3. Notable opinions from popular investors and analysts on X (formerly Twitter)
4. Recent news or events impacting the company
5. Technical levels traders are watching
6. Overall bull vs bear case summary

Focus on actionable insights and current market dynamics. Keep it concise (4-5 sentences) but informative. Consider sentiment from well-known finance personalities on X like @chamath, @elonmusk, @jimcramer, @markminervini, and other influential investors.`;
}

export class CompanyNarrativeService {
  private cacheExpiryMinutes = 120; // Cache for 2 hours (company-specific data changes less frequently)

  async getCompanyNarrative(symbol: string, companyName?: string): Promise<string | null> {
    try {
      // Clean up expired narratives
      await this.cleanupExpired();
      
      // Check cache for valid narrative
      const cached = await this.getCachedNarrative(symbol);
      if (cached) {
        console.log(`📊 Using cached narrative for ${symbol}`);
        return cached;
      }
      
      // No valid cache, fetch from Grok
      console.log(`🔄 Fetching fresh narrative for ${symbol} from Grok...`);
      const grokService = createGrokService();
      if (!grokService) {
        console.warn('⚠️ Grok service not available');
        return null;
      }
      
      const prompt = generateCompanyNarrativePrompt(symbol, companyName);
      const narrative = await grokService.getMarketSummary(prompt);
      
      // Cache the narrative if it's valid (not an error message)
      if (narrative && !narrative.startsWith('⚠️')) {
        await this.cacheNarrative(symbol, narrative);
      }
      
      return narrative;
    } catch (error) {
      console.error(`❌ Error getting narrative for ${symbol}:`, error);
      return null;
    }
  }
  
  private async getCachedNarrative(symbol: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('company_narrative_cache')
        .select('narrative')
        .eq('symbol', symbol)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.narrative;
    } catch (error) {
      console.error(`Error fetching cached narrative for ${symbol}:`, error);
      return null;
    }
  }
  
  private async cacheNarrative(symbol: string, narrative: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpiryMinutes);
      
      const { error } = await supabase
        .from('company_narrative_cache')
        .insert({
          symbol,
          narrative,
          expires_at: expiresAt.toISOString()
        });
      
      if (error) {
        console.error(`Error caching narrative for ${symbol}:`, error);
      } else {
        console.log(`✅ Narrative for ${symbol} cached successfully`);
      }
    } catch (error) {
      console.error(`Error caching narrative for ${symbol}:`, error);
    }
  }
  
  private async cleanupExpired(): Promise<void> {
    try {
      const { error } = await supabase
        .from('company_narrative_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Error cleaning up expired narratives:', error);
      }
    } catch (error) {
      console.error('Error cleaning up expired narratives:', error);
    }
  }
  
  async invalidateCache(symbol: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('company_narrative_cache')
        .delete()
        .eq('symbol', symbol);
      
      if (error) {
        console.error(`Error invalidating cache for ${symbol}:`, error);
      } else {
        console.log(`✅ Cache invalidated for ${symbol}`);
      }
    } catch (error) {
      console.error(`Error invalidating cache for ${symbol}:`, error);
    }
  }
}

export const companyNarrativeService = new CompanyNarrativeService();