import { Note, NoteStatus, NoteCategory, TimeSession } from '../types';

const STORAGE_KEY = 'chronos_notes_data';
const DELAY_MS = 200;

// Simulate async behavior of a real database
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getNotesFromStorage = (): Note[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveNotesToStorage = (notes: Note[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

export const storageService = {
  async getNotes(): Promise<Note[]> {
    await delay(DELAY_MS);
    return getNotesFromStorage();
  },

  async saveNote(note: Note): Promise<void> {
    const notes = getNotesFromStorage();
    const existingIndex = notes.findIndex(n => n.id === note.id);
    
    const updatedNote = {
      ...note,
      updatedAt: Date.now(),
      createdAt: existingIndex >= 0 ? notes[existingIndex].createdAt : Date.now()
    };
    
    if (existingIndex >= 0) {
      notes[existingIndex] = updatedNote;
    } else {
      notes.push(updatedNote);
    }
    
    saveNotesToStorage(notes);
  },

  async deleteNote(noteId: string): Promise<void> {
    const notes = getNotesFromStorage();
    const filtered = notes.filter(n => n.id !== noteId);
    saveNotesToStorage(filtered);
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