import { Note, NoteStatus, NoteCategory, TimeSession } from '../types';

const STORAGE_KEY = 'chronos_notes_data';

// Simulate async behavior of a real database
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const storageService = {
  async getNotes(): Promise<Note[]> {
    await delay(200); // Simulate network latency
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async saveNote(note: Note): Promise<void> {
    const notes = await this.getNotes();
    const existingIndex = notes.findIndex(n => n.id === note.id);
    
    if (existingIndex >= 0) {
      notes[existingIndex] = { ...note, updatedAt: Date.now() };
    } else {
      notes.push({ ...note, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  },

  async deleteNote(noteId: string): Promise<void> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== noteId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  createEmptyNote(): Note {
    return {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      status: NoteStatus.DRAFT,
      category: NoteCategory.UNCATEGORIZED,
      tags: [],
      totalTime: 0,
      sessions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
};