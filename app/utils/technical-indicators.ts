export interface MovingAveragePoint {
  date: Date;
  value: number;
}

export interface DataPoint {
  date: Date;
  price: number;
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param data Array of data points with date and price
 * @param period Number of periods for the moving average (e.g., 20, 50, 200)
 * @returns Array of moving average points
 */
export function calculateSMA(data: DataPoint[], period: number): MovingAveragePoint[] {
  if (data.length < period) {
    return [];
  }

  const smaData: MovingAveragePoint[] = [];
  
  // Sort data by date to ensure correct order
  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  for (let i = period - 1; i < sortedData.length; i++) {
    const slice = sortedData.slice(i - period + 1, i + 1);
    const sum = slice.reduce((total, point) => total + point.price, 0);
    const average = sum / period;
    
    smaData.push({
      date: sortedData[i].date,
      value: average,
    });
  }
  
  return smaData;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data Array of data points with date and price
 * @param period Number of periods for the moving average
 * @returns Array of moving average points
 */
export function calculateEMA(data: DataPoint[], period: number): MovingAveragePoint[] {
  if (data.length < period) {
    return [];
  }

  const emaData: MovingAveragePoint[] = [];
  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate the smoothing factor
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first EMA value
  const firstSMA = sortedData.slice(0, period).reduce((sum, point) => sum + point.price, 0) / period;
  emaData.push({
    date: sortedData[period - 1].date,
    value: firstSMA,
  });
  
  // Calculate EMA for remaining points
  for (let i = period; i < sortedData.length; i++) {
    const currentPrice = sortedData[i].price;
    const previousEMA = emaData[emaData.length - 1].value;
    const currentEMA = (currentPrice * multiplier) + (previousEMA * (1 - multiplier));
    
    emaData.push({
      date: sortedData[i].date,
      value: currentEMA,
    });
  }
  
  return emaData;
}

/**
 * Calculate multiple moving averages at once
 * @param data Array of data points
 * @param periods Array of periods to calculate (e.g., [20, 50, 200])
 * @param type Type of moving average ('SMA' or 'EMA')
 * @returns Object with period as key and moving average data as value
 */
export function calculateMovingAverages(
  data: DataPoint[], 
  periods: number[], 
  type: 'SMA' | 'EMA' = 'SMA'
): Record<number, MovingAveragePoint[]> {
  const result: Record<number, MovingAveragePoint[]> = {};
  
  periods.forEach(period => {
    result[period] = type === 'SMA' 
      ? calculateSMA(data, period)
      : calculateEMA(data, period);
  });
  
  return result;
}

/**
 * Common moving average periods
 */
export const COMMON_MA_PERIODS = {
  SHORT_TERM: [5, 10, 20],
  MEDIUM_TERM: [50, 100],
  LONG_TERM: [200],
  ALL: [5, 10, 20, 50, 100, 200],
} as const;