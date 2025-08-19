import { supabaseAdmin } from '../lib/supabase';
import type { TickerNoteRow, TickerNoteInsert, TickerNoteUpdate } from '../types/database';

export class NotesService {
  /**
   * Get all notes for a specific ticker symbol
   */
  async getNotesBySymbol(symbol: string): Promise<TickerNoteRow[]> {
    const { data, error } = await supabaseAdmin
      .from('ticker_notes')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Error fetching notes for ${symbol}:`, error);
      return [];
    }

    console.log(`📝 Loaded ${data?.length || 0} notes for ${symbol}`);
    return data || [];
  }

  /**
   * Add a new note for a ticker
   */
  async addNote(symbol: string, noteText: string, noteType: string = 'general'): Promise<TickerNoteRow | null> {
    const insertData: TickerNoteInsert = {
      symbol: symbol.toUpperCase(),
      note_text: noteText.trim(),
      note_type: noteType,
    };

    const { data, error } = await supabaseAdmin
      .from('ticker_notes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error adding note for ${symbol}:`, error);
      return null;
    }

    console.log(`✅ Added note for ${symbol}`);
    return data;
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId: number, updates: TickerNoteUpdate): Promise<TickerNoteRow | null> {
    const { data, error } = await supabaseAdmin
      .from('ticker_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error updating note ${noteId}:`, error);
      return null;
    }

    console.log(`✅ Updated note ${noteId}`);
    return data;
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('ticker_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error(`❌ Error deleting note ${noteId}:`, error);
      return false;
    }

    console.log(`🗑️ Deleted note ${noteId}`);
    return true;
  }

  /**
   * Get notes statistics for a symbol
   */
  async getNotesStats(symbol: string): Promise<{
    totalNotes: number;
    noteTypes: { [key: string]: number };
    lastUpdated: string | null;
  }> {
    const { data, error } = await supabaseAdmin
      .from('ticker_notes')
      .select('note_type, updated_at')
      .eq('symbol', symbol.toUpperCase());

    if (error) {
      console.error(`❌ Error fetching notes stats for ${symbol}:`, error);
      return {
        totalNotes: 0,
        noteTypes: {},
        lastUpdated: null,
      };
    }

    const totalNotes = data?.length || 0;
    const noteTypes: { [key: string]: number } = {};
    let lastUpdated: string | null = null;

    if (data) {
      data.forEach(note => {
        noteTypes[note.note_type] = (noteTypes[note.note_type] || 0) + 1;
        if (!lastUpdated || note.updated_at > lastUpdated) {
          lastUpdated = note.updated_at;
        }
      });
    }

    return {
      totalNotes,
      noteTypes,
      lastUpdated,
    };
  }

  /**
   * Get all available note types
   */
  getNoteTypes(): { value: string; label: string }[] {
    return [
      { value: 'general', label: 'General' },
      { value: 'analysis', label: 'Analysis' },
      { value: 'trade_idea', label: 'Trade Idea' },
      { value: 'research', label: 'Research' },
      { value: 'earnings', label: 'Earnings' },
      { value: 'news', label: 'News' },
      { value: 'technical', label: 'Technical' },
      { value: 'fundamental', label: 'Fundamental' },
    ];
  }
}

// Export singleton instance
export const notesService = new NotesService();