export interface MarketStatus {
  isOpen: boolean;
  status: 'open' | 'closed' | 'pre-market' | 'after-market';
  nextOpen?: Date;
  nextClose?: Date;
}

export function getMarketStatus(): MarketStatus {
  const now = new Date();
  
  // Convert current time to Eastern Time
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const currentDay = easternTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = easternTime.getHours();
  const currentMinute = easternTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
  const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
  const marketClose = 16 * 60; // 4:00 PM in minutes
  
  // Check if it's a weekday (Monday = 1, Friday = 5)
  const isWeekday = currentDay >= 1 && currentDay <= 5;
  
  if (!isWeekday) {
    return {
      isOpen: false,
      status: 'closed',
      nextOpen: getNextMarketOpen(easternTime)
    };
  }
  
  if (currentTimeInMinutes >= marketOpen && currentTimeInMinutes < marketClose) {
    return {
      isOpen: true,
      status: 'open',
      nextClose: getMarketCloseToday(easternTime)
    };
  } else if (currentTimeInMinutes < marketOpen) {
    return {
      isOpen: false,
      status: 'pre-market',
      nextOpen: getMarketOpenToday(easternTime)
    };
  } else {
    return {
      isOpen: false,
      status: 'after-market',
      nextOpen: getNextMarketOpen(easternTime)
    };
  }
}

function getMarketOpenToday(easternTime: Date): Date {
  const openTime = new Date(easternTime);
  openTime.setHours(9, 30, 0, 0);
  return openTime;
}

function getMarketCloseToday(easternTime: Date): Date {
  const closeTime = new Date(easternTime);
  closeTime.setHours(16, 0, 0, 0);
  return closeTime;
}

function getNextMarketOpen(easternTime: Date): Date {
  const nextOpen = new Date(easternTime);
  
  // If it's Friday after market close or weekend, next open is Monday
  if (easternTime.getDay() === 5 && easternTime.getHours() >= 16) {
    // Friday after close - next Monday
    nextOpen.setDate(nextOpen.getDate() + 3);
  } else if (easternTime.getDay() === 6) {
    // Saturday - next Monday
    nextOpen.setDate(nextOpen.getDate() + 2);
  } else if (easternTime.getDay() === 0) {
    // Sunday - next Monday
    nextOpen.setDate(nextOpen.getDate() + 1);
  } else {
    // Weekday - next day
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  
  nextOpen.setHours(9, 30, 0, 0);
  return nextOpen;
}

export function getMarketStatusText(status: MarketStatus): string {
  switch (status.status) {
    case 'open':
      return 'Market Open';
    case 'closed':
      return 'Market Closed';
    case 'pre-market':
      return 'Pre-Market';
    case 'after-market':
      return 'After Hours';
    default:
      return 'Market Closed';
  }
}