import { useState, useEffect } from 'react';

interface UseMarketSummaryReturn {
  summary: string | null;
  loading: boolean;
  error: string | null;
}

export function useMarketSummary(): UseMarketSummaryReturn {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketSummary() {
      try {
        const response = await fetch('/api/market-summary');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSummary(data.summary);
        setError(null);
      } catch (err) {
        console.error('Error fetching market summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch market summary');
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMarketSummary();
  }, []);

  return { summary, loading, error };
}