import { supabase } from '../lib/supabase';
import { createGrokService } from './grok';

interface MarketSummaryCache {
  id: string;
  summary: string;
  created_at: string;
  expires_at: string;
}

export class MarketSummaryCacheService {
  private cacheExpiryMinutes = 60; // Cache for 1 hour

  async getMarketSummary(): Promise<string | null> {
    try {
      // First, clean up expired summaries
      await this.cleanupExpired();
      
      // Check cache for valid summary
      const cached = await this.getCachedSummary();
      if (cached) {
        console.log('📊 Using cached market summary');
        return cached;
      }
      
      // No valid cache, fetch from Grok
      console.log('🔄 Fetching fresh market summary from Grok...');
      const grokService = createGrokService();
      if (!grokService) {
        console.warn('⚠️ Grok service not available');
        return null;
      }
      
      const summary = await grokService.getMarketSummary();
      
      // Cache the summary if it's valid (not an error message)
      if (summary && !summary.startsWith('⚠️')) {
        await this.cacheSummary(summary);
      }
      
      return summary;
    } catch (error) {
      console.error('❌ Error getting market summary:', error);
      return null;
    }
  }
  
  private async getCachedSummary(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('market_summary_cache')
        .select('summary')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.summary;
    } catch (error) {
      console.error('Error fetching cached summary:', error);
      return null;
    }
  }
  
  private async cacheSummary(summary: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpiryMinutes);
      
      const { error } = await supabase
        .from('market_summary_cache')
        .insert({
          summary,
          expires_at: expiresAt.toISOString()
        });
      
      if (error) {
        console.error('Error caching summary:', error);
      } else {
        console.log('✅ Market summary cached successfully');
      }
    } catch (error) {
      console.error('Error caching summary:', error);
    }
  }
  
  private async cleanupExpired(): Promise<void> {
    try {
      const { error } = await supabase
        .from('market_summary_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Error cleaning up expired summaries:', error);
      }
    } catch (error) {
      console.error('Error cleaning up expired summaries:', error);
    }
  }
  
  async getCacheStats(): Promise<{ count: number; latestExpiry: Date | null }> {
    try {
      const { data, error } = await supabase
        .from('market_summary_cache')
        .select('expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false });
      
      if (error || !data) {
        return { count: 0, latestExpiry: null };
      }
      
      return {
        count: data.length,
        latestExpiry: data.length > 0 ? new Date(data[0].expires_at) : null
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { count: 0, latestExpiry: null };
    }
  }
}

export const marketSummaryCacheService = new MarketSummaryCacheService();