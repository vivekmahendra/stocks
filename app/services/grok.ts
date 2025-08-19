export interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const MARKET_SUMMARY_PROMPT = `Provide a concise market summary from a macro perspective. Include:
1. Overall market sentiment and key indices performance
2. Notable sector movements
3. Key economic indicators or events impacting markets
4. Brief outlook for the trading session
Keep it to 3-4 sentences, focused and actionable for traders.`;

export class GrokService {
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getMarketSummary(customPrompt?: string): Promise<string> {
    const prompt = customPrompt || MARKET_SUMMARY_PROMPT;
    
    console.log('📊 Fetching market summary from Grok API...');
    
    const requestBody = {
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst providing market insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'grok-4'
    };
    
    console.log('📤 Request to Grok API:', JSON.stringify(requestBody, null, 2));
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Check for specific error codes
        if (response.status === 402) {
          return '⚠️ Grok API credits have expired. Please renew your subscription to continue receiving market insights.';
        } else if (response.status === 429) {
          return '⚠️ Rate limit reached. Market summary will be available again shortly.';
        } else if (response.status === 401) {
          return '⚠️ Invalid API key. Please check your Grok API configuration.';
        }
        
        // Try to get error details from response
        try {
          const errorData = await response.json();
          console.error('Grok API error details:', errorData);
          if (errorData.error?.message) {
            return `⚠️ ${errorData.error.message}`;
          }
        } catch {
          // If we can't parse the error response, use generic message
        }
        
        throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
      }

      const data: GrokResponse = await response.json();
      console.log('📊 Grok API response:', JSON.stringify(data, null, 2));
      
      if (!data.choices || data.choices.length === 0) {
        console.warn('⚠️ No choices in Grok response');
        return 'Unable to generate market summary - no response data.';
      }
      
      const content = data.choices[0]?.message?.content;
      if (!content) {
        console.warn('⚠️ No content in Grok response choice');
        return 'Unable to generate market summary - empty response.';
      }
      
      return content;
    } catch (error) {
      console.error('Error fetching market summary:', error);
      if (error instanceof Error && error.message.includes('402')) {
        return '⚠️ Grok API credits have expired. Please renew your subscription.';
      }
      return '⚠️ Market summary temporarily unavailable. Check console for details.';
    }
  }
}

export function createGrokService(): GrokService | null {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    console.warn('XAI_API_KEY not found in environment variables');
    return null;
  }
  
  console.log('✅ Grok service initialized with API key');
  return new GrokService(apiKey);
}