/**
 * Market time utilities for handling US stock market trading days and timezone
 */

// US stock market holidays (major ones that affect trading)
const MARKET_HOLIDAYS_2024 = [
  '2024-01-01', // New Year's Day
  '2024-01-15', // Martin Luther King Jr. Day
  '2024-02-19', // Presidents' Day
  '2024-03-29', // Good Friday
  '2024-05-27', // Memorial Day
  '2024-06-19', // Juneteenth
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-11-28', // Thanksgiving
  '2024-12-25', // Christmas Day
];

const MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas Day
];

const ALL_MARKET_HOLIDAYS = [...MARKET_HOLIDAYS_2024, ...MARKET_HOLIDAYS_2025];

/**
 * Convert a date to Eastern Time (market timezone)
 * Note: This is a simplified conversion that doesn't handle DST properly
 * For production, consider using a proper timezone library like date-fns-tz
 */
export function toMarketTime(date: Date): Date {
  // For Alpaca daily bars, we actually don't want to convert timezone
  // The date "2024-08-19T00:00:00Z" represents August 19th trading day
  // Converting timezone would shift it to August 18th
  return new Date(date);
}

/**
 * Get the current market time
 */
export function getMarketTime(): Date {
  // For current time, we do want to consider timezone
  // August 19th 2:00 PM MST = August 19th 4:00 PM EST
  const now = new Date();
  const estOffset = -5 * 60; // EST is UTC-5 (in minutes)
  const currentOffset = now.getTimezoneOffset(); // Current timezone offset from UTC
  const offsetDiff = currentOffset - estOffset;
  
  return new Date(now.getTime() + (offsetDiff * 60 * 1000));
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  // Use UTC day to ensure consistent timezone handling
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a market holiday
 */
export function isMarketHoliday(date: Date): boolean {
  // Use UTC date to ensure consistent timezone handling
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  return ALL_MARKET_HOLIDAYS.includes(dateString);
}

/**
 * Check if a date is a trading day (not weekend and not holiday)
 */
export function isTradingDay(date: Date): boolean {
  return !isWeekend(date) && !isMarketHoliday(date);
}

/**
 * Get the previous trading day from a given date
 */
export function getPreviousTradingDay(date: Date): Date {
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  
  // Keep going back until we find a trading day
  while (!isTradingDay(previousDay)) {
    previousDay.setDate(previousDay.getDate() - 1);
  }
  
  return previousDay;
}

/**
 * Get the next trading day from a given date
 */
export function getNextTradingDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Keep going forward until we find a trading day
  while (!isTradingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * Get the most recent trading day (today if it's a trading day, otherwise the previous one)
 */
export function getMostRecentTradingDay(): Date {
  const today = getMarketTime();
  
  if (isTradingDay(today)) {
    return today;
  }
  
  return getPreviousTradingDay(today);
}

/**
 * Filter an array of dates to include only trading days
 */
export function filterTradingDays(dates: Date[]): Date[] {
  return dates.filter(isTradingDay);
}

/**
 * Check if the market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET on trading days
 */
export function isMarketOpen(): boolean {
  const marketTime = getMarketTime();
  
  // Check if today is a trading day
  if (!isTradingDay(marketTime)) {
    return false;
  }
  
  const hours = marketTime.getHours();
  const minutes = marketTime.getMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;
  
  // Market opens at 9:30 AM (570 minutes) and closes at 4:00 PM (960 minutes)
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseMinutes = 16 * 60; // 4:00 PM
  
  return currentTimeInMinutes >= marketOpenMinutes && currentTimeInMinutes < marketCloseMinutes;
}

/**
 * Format a date for display on charts (market-aware)
 */
export function formatMarketDate(date: Date, format: 'short' | 'long' = 'short'): string {
  // Use UTC dates for consistent formatting
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }
  
  // Short format: MM/DD using UTC
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

/**
 * Convert a date string from Alpaca API (UTC) to market date
 */
export function parseAlpacaDate(dateString: string): Date {
  // Alpaca returns dates like "2024-08-19T00:00:00Z" for daily bars
  // Extract just the date part to avoid timezone issues
  const dateOnly = dateString.split('T')[0]; // "2024-08-19"
  
  // Create UTC date to ensure consistent interpretation across timezones
  // This ensures that 2024-08-19 always represents August 19th regardless of local timezone
  return new Date(dateOnly + 'T12:00:00.000Z'); // Use noon UTC to avoid midnight timezone issues
}

/**
 * Get a date range that only includes trading days
 */
export function getTradingDayRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isTradingDay(current)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}