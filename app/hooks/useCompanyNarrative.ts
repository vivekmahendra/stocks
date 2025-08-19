import { useState, useEffect } from 'react';

interface UseCompanyNarrativeReturn {
  narrative: string | null;
  loading: boolean;
  error: string | null;
}

export function useCompanyNarrative(symbol: string): UseCompanyNarrativeReturn {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    async function fetchCompanyNarrative() {
      try {
        setLoading(true);
        setError(null);
        setNarrative(null);
        
        const response = await fetch(`/api/company-narrative/${encodeURIComponent(symbol)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setNarrative(data.narrative);
      } catch (err) {
        console.error(`Error fetching narrative for ${symbol}:`, err);
        setError(err instanceof Error ? err.message : `Failed to fetch narrative for ${symbol}`);
        setNarrative(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCompanyNarrative();
  }, [symbol]);

  return { narrative, loading, error };
}