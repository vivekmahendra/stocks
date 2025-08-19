// Debug script to check cache data
// Run with: SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node debug-cache.js

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCache() {
  console.log('🔍 Debugging cache data...\n');

  // Check AAPL data specifically
  const { data, error } = await supabase
    .from('stock_bars')
    .select('*')
    .eq('symbol', 'AAPL')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No AAPL data found in cache');
    return;
  }

  console.log(`📊 Found ${data.length} AAPL records`);
  console.log(`📅 Date range: ${data[0].timestamp} to ${data[data.length - 1].timestamp}`);
  
  // Check for gaps
  const dates = data.map(d => new Date(d.timestamp));
  let gaps = 0;
  for (let i = 1; i < dates.length; i++) {
    const dayDiff = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
    if (dayDiff > 3) { // More than 3 days gap (accounting for weekends)
      gaps++;
      console.log(`🕳️ Gap detected: ${dates[i-1].toDateString()} to ${dates[i].toDateString()} (${Math.floor(dayDiff)} days)`);
    }
  }
  
  if (gaps === 0) {
    console.log('✅ No significant gaps detected');
  } else {
    console.log(`⚠️ Found ${gaps} potential gaps`);
  }

  // Check by year
  const byYear = {};
  data.forEach(d => {
    const year = new Date(d.timestamp).getFullYear();
    byYear[year] = (byYear[year] || 0) + 1;
  });
  
  console.log('\n📈 Records by year:');
  Object.entries(byYear).forEach(([year, count]) => {
    console.log(`  ${year}: ${count} records`);
  });

  // Calculate 2 years ago
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  console.log(`\n🕒 Two years ago: ${twoYearsAgo.toDateString()}`);
  console.log(`🕒 Earliest record: ${new Date(data[0].timestamp).toDateString()}`);
  
  const shouldHave2Years = new Date(data[0].timestamp) <= twoYearsAgo;
  console.log(`🎯 Should have 2 years of data: ${shouldHave2Years ? '✅ YES' : '❌ NO'}`);
}

debugCache().catch(console.error);