import type { StockData } from '../types/stock';

interface TickerInsightsProps {
  symbol: string;
  stockData: StockData;
}

interface InsightCard {
  type: 'technical' | 'fundamental' | 'sentiment' | 'news';
  title: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  details: string[];
  lastUpdated: string;
}

export function TickerInsights({ symbol, stockData }: TickerInsightsProps) {
  // Mock insights data - to be replaced with real LLM-generated insights
  const mockInsights: InsightCard[] = [
    {
      type: 'technical',
      title: 'Technical Analysis',
      summary: 'Price action shows bullish momentum with strong support levels',
      confidence: 'high',
      details: [
        'Price trading above 20-day moving average',
        'RSI indicates room for further upside',
        'Volume confirms recent price movements',
        'Key resistance at $195.50 level'
      ],
      lastUpdated: '2 hours ago'
    },
    {
      type: 'fundamental',
      title: 'Fundamental Outlook',
      summary: 'Strong earnings growth expected with positive guidance',
      confidence: 'medium',
      details: [
        'Revenue growth accelerating in key segments',
        'Margin expansion opportunities identified',
        'Market share gains in core business',
        'Management guidance remains optimistic'
      ],
      lastUpdated: '6 hours ago'
    },
    {
      type: 'sentiment',
      title: 'Market Sentiment',
      summary: 'Overall sentiment remains positive with some caution',
      confidence: 'medium',
      details: [
        'Analyst recommendations trending positive',
        'Social media sentiment score: 7.2/10',
        'Options flow suggests bullish positioning',
        'Institutional buying detected last week'
      ],
      lastUpdated: '4 hours ago'
    },
    {
      type: 'news',
      title: 'News & Events',
      summary: 'Recent developments support continued growth trajectory',
      confidence: 'high',
      details: [
        'New product launch receiving positive reviews',
        'Partnership announcement expands market reach',
        'Regulatory approval for key initiative',
        'Earnings call scheduled for next week'
      ],
      lastUpdated: '1 hour ago'
    }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'technical':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'fundamental':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'sentiment':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'news':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical':
        return 'text-blue-600 bg-blue-50';
      case 'fundamental':
        return 'text-green-600 bg-green-50';
      case 'sentiment':
        return 'text-purple-600 bg-purple-50';
      case 'news':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          AI Insights for {symbol}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">
            Powered by AI
          </span>
          <span className="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Demo Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <div className="w-5 h-5 text-blue-500 mt-0.5 mr-3">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h5 className="text-sm font-medium text-blue-800">AI-Powered Analysis</h5>
            <p className="text-sm text-blue-700 mt-1">
              This section will feature real-time insights generated by Large Language Models, 
              analyzing technical patterns, fundamental data, market sentiment, and news sentiment 
              to provide actionable investment insights.
            </p>
          </div>
        </div>
      </div>

      {/* Mock Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockInsights.map((insight, index) => (
          <div key={index} className="relative border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow opacity-75">
            {/* Placeholder shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 animate-pulse"></div>
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(insight.type)}`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{insight.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(insight.confidence)}`}>
                        {insight.confidence} confidence
                      </span>
                      <span className="text-xs text-gray-500">{insight.lastUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-4 font-medium">{insight.summary}</p>

              <ul className="space-y-2">
                {insight.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View detailed analysis →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Info */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h5 className="text-sm font-medium text-gray-800 mb-2">Planned LLM Integrations</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Technical Analysis:</span>
            <p>Pattern recognition, trend analysis, support/resistance levels</p>
          </div>
          <div>
            <span className="font-medium">Fundamental Review:</span>
            <p>Financial statement analysis, valuation metrics, growth prospects</p>
          </div>
          <div>
            <span className="font-medium">Sentiment Analysis:</span>
            <p>Social media, news sentiment, analyst opinions aggregation</p>
          </div>
          <div>
            <span className="font-medium">Market Context:</span>
            <p>Sector trends, economic indicators, competitive positioning</p>
          </div>
        </div>
      </div>
    </div>
  );
}