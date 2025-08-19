#!/usr/bin/env node

/**
 * Script to update existing watchlist entries with their price_at_addition
 * Run this after applying the database migration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const alpacaApiKey = process.env.ALPACA_API_KEY;
const alpacaSecretKey = process.env.ALPACA_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!alpacaApiKey || !alpacaSecretKey) {
  console.error('❌ Missing Alpaca API credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getStockPrice(symbol, date) {
  const endDate = new Date(date);
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 10); // Go back 10 days to ensure we get data
  
  const params = new URLSearchParams({
    symbols: symbol,
    timeframe: '1Day',
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    feed: 'iex',
    limit: '10',
  });
  
  const url = `https://data.alpaca.markets/v2/stocks/bars?${params}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch price for ${symbol}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.bars && data.bars[symbol] && data.bars[symbol].length > 0) {
      // Sort bars by date and find the one closest to the added date
      const bars = data.bars[symbol].sort((a, b) => 
        new Date(a.t).getTime() - new Date(b.t).getTime()
      );
      
      const targetDate = date.split('T')[0];
      
      // Try to find exact match
      let targetBar = bars.find(bar => bar.t.split('T')[0] === targetDate);
      
      // If no exact match, find the closest one
      if (!targetBar) {
        targetBar = bars.find(bar => bar.t.split('T')[0] >= targetDate) || bars[bars.length - 1];
      }
      
      if (targetBar) {
        console.log(`   Found price for ${symbol} on ${targetBar.t.split('T')[0]}: $${targetBar.c}`);
        return targetBar.c;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

async function updateWatchlistPrices() {
  console.log('🔄 Fetching watchlist entries without prices...');
  
  // Get all active watchlist entries without price_at_addition
  const { data: watchlistEntries, error } = await supabase
    .from('watchlist')
    .select('*')
    .is('price_at_addition', null)
    .eq('is_active', true);
  
  if (error) {
    console.error('❌ Error fetching watchlist:', error);
    return;
  }
  
  if (!watchlistEntries || watchlistEntries.length === 0) {
    console.log('✅ All watchlist entries already have prices!');
    return;
  }
  
  console.log(`📊 Found ${watchlistEntries.length} entries to update`);
  
  for (const entry of watchlistEntries) {
    console.log(`\n🔍 Processing ${entry.symbol} (added ${entry.added_date.split('T')[0]})`);
    
    const price = await getStockPrice(entry.symbol, entry.added_date);
    
    if (price) {
      const { error: updateError } = await supabase
        .from('watchlist')
        .update({ price_at_addition: price })
        .eq('id', entry.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${entry.symbol}:`, updateError);
      } else {
        console.log(`✅ Updated ${entry.symbol} with price: $${price}`);
      }
    } else {
      console.log(`⚠️ Could not find price for ${entry.symbol}`);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✨ Done updating watchlist prices!');
}

// Run the script
updateWatchlistPrices().catch(console.error);