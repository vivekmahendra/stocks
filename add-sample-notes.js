// Add sample historical notes for demonstration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sampleNotes = [
  {
    symbol: 'AAPL',
    note_text: 'Strong quarterly earnings beat expectations. iPhone sales up 12% YoY. Bullish on Q4 guidance.',
    note_type: 'earnings',
    created_at: '2024-08-10T14:30:00Z',
    updated_at: '2024-08-10T14:30:00Z'
  },
  {
    symbol: 'AAPL', 
    note_text: 'Technical breakout above $180 resistance. Volume spike suggests institutional buying.',
    note_type: 'technical',
    created_at: '2024-07-15T09:45:00Z',
    updated_at: '2024-07-15T09:45:00Z'
  },
  {
    symbol: 'TSLA',
    note_text: 'Cybertruck production ramping up. Management confident in Q4 delivery targets.',
    note_type: 'news',
    created_at: '2024-06-20T11:20:00Z',
    updated_at: '2024-06-20T11:20:00Z'
  },
  {
    symbol: 'TSLA',
    note_text: 'P/E still elevated at 65x. Waiting for better entry point around $200 support level.',
    note_type: 'analysis',
    created_at: '2024-05-08T16:15:00Z',
    updated_at: '2024-05-08T16:15:00Z'
  },
  {
    symbol: 'SPY',
    note_text: 'Fed hawkish tone at Jackson Hole. Expecting continued rate pressure through year-end.',
    note_type: 'fundamental',
    created_at: '2024-08-25T13:00:00Z',
    updated_at: '2024-08-25T13:00:00Z'
  },
  {
    symbol: 'GOOG',
    note_text: 'AI advancements in Bard looking promising. Could be catalyst for multiple expansion.',
    note_type: 'research',
    created_at: '2024-07-03T10:30:00Z',
    updated_at: '2024-07-03T10:30:00Z'
  }
];

async function addSampleNotes() {
  console.log('🔄 Adding sample historical notes...');
  
  try {
    const { data, error } = await supabase
      .from('ticker_notes')
      .insert(sampleNotes)
      .select();

    if (error) {
      console.error('❌ Error adding notes:', error);
      return;
    }

    console.log('✅ Successfully added sample notes:');
    data.forEach(note => {
      console.log(`  📝 ${note.symbol}: ${note.note_type} note on ${new Date(note.created_at).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addSampleNotes();