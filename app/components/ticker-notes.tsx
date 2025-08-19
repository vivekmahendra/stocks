import React, { useState } from 'react';
import { Form, useSubmit, useNavigation } from 'react-router';
import type { TickerNoteRow } from '../types/database';
import { Select, type SelectOption } from './ui/select';

interface TickerNotesProps {
  symbol: string;
  notes: TickerNoteRow[];
}

const noteTypeOptions: SelectOption[] = [
  { value: 'general', label: 'General' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'trade_idea', label: 'Trade Idea' },
  { value: 'research', label: 'Research' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'news', label: 'News' },
  { value: 'technical', label: 'Technical' },
  { value: 'fundamental', label: 'Fundamental' },
];

const getNoteTypeColor = (type: string) => {
  const colors: { [key: string]: string } = {
    general: 'bg-gray-100 text-gray-800',
    analysis: 'bg-blue-100 text-blue-800',
    trade_idea: 'bg-green-100 text-green-800',
    research: 'bg-purple-100 text-purple-800',
    earnings: 'bg-yellow-100 text-yellow-800',
    news: 'bg-red-100 text-red-800',
    technical: 'bg-indigo-100 text-indigo-800',
    fundamental: 'bg-pink-100 text-pink-800',
  };
  return colors[type] || colors.general;
};

export function TickerNotes({ symbol, notes }: TickerNotesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<TickerNoteRow | null>(null);
  const [newNote, setNewNote] = useState({ text: '', type: 'general' });
  const [editNoteData, setEditNoteData] = useState({ text: '', type: 'general' });

  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.text.trim()) return;

    const formData = new FormData();
    formData.append('action', 'add-note');
    formData.append('symbol', symbol);
    formData.append('noteText', newNote.text.trim());
    formData.append('noteType', newNote.type);

    submit(formData, { method: 'post' });
    
    setNewNote({ text: '', type: 'general' });
    setShowAddForm(false);
  };

  const handleEditNote = (note: TickerNoteRow) => {
    setEditingNote(note);
    setEditNoteData({ text: note.note_text, type: note.note_type });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editNoteData.text.trim()) return;

    const formData = new FormData();
    formData.append('action', 'update-note');
    formData.append('noteId', editingNote.id.toString());
    formData.append('noteText', editNoteData.text.trim());
    formData.append('noteType', editNoteData.type);

    submit(formData, { method: 'post' });
    
    setEditingNote(null);
    setEditNoteData({ text: '', type: 'general' });
  };

  const handleDeleteNote = (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    const formData = new FormData();
    formData.append('action', 'delete-note');
    formData.append('noteId', noteId.toString());

    submit(formData, { method: 'post' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Research Notes</h3>
              <p className="text-sm text-gray-500">{symbol} • {notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              showAddForm 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {showAddForm ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Note
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Add Note Form */}
        {showAddForm && (
          <div className="mb-6 bg-blue-50 rounded-xl p-6 border border-blue-100">
            <Form onSubmit={handleAddNote} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label htmlFor="noteType" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <Select
                    value={newNote.type}
                    onValueChange={(value) => setNewNote({ ...newNote, type: value })}
                    options={noteTypeOptions}
                    placeholder="Select category"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="noteText" className="block text-sm font-medium text-gray-700 mb-2">
                    Your thoughts and analysis
                  </label>
                  <textarea
                    id="noteText"
                    value={newNote.text}
                    onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                    rows={4}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Share your insights, analysis, or observations about this stock..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewNote({ text: '', type: 'general' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newNote.text.trim()}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Note'
                  )}
                </button>
              </div>
            </Form>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !showAddForm ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Start building your research</h4>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Capture your thoughts, analysis, and insights about {symbol} to build your investment thesis.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Note
            </button>
          </div>
        ) : notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
                {editingNote?.id === note.id ? (
                  /* Edit Form */
                  <Form onSubmit={handleSaveEdit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Select
                          value={editNoteData.type}
                          onValueChange={(value) => setEditNoteData({ ...editNoteData, type: value })}
                          options={noteTypeOptions}
                          className="text-sm"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <textarea
                          value={editNoteData.text}
                          onChange={(e) => setEditNoteData({ ...editNoteData, text: e.target.value })}
                          rows={3}
                          className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditingNote(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </Form>
                ) : (
                  /* Display Note */
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getNoteTypeColor(note.note_type)}`}>
                        {noteTypeOptions.find(opt => opt.value === note.note_type)?.label || note.note_type}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap mb-3">{note.note_text}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(note.created_at)}
                        </span>
                        {note.updated_at !== note.created_at && (
                          <span className="flex items-center text-blue-600">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edited {formatDate(note.updated_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}