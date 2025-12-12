import React, { useState, useEffect, useCallback } from 'react';
import { storageService } from './services/storageService';
import { Note, ViewMode } from './types';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import StatsView from './components/StatsView';
import { BarChart3, Layout } from 'lucide-react';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      const data = await storageService.getNotes();
      setNotes(data.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    };
    loadNotes();
  }, []);

  const handleCreateNote = () => {
    const newNote = storageService.createEmptyNote();
    setSelectedNote(newNote);
    setViewMode('DETAIL');
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setViewMode('DETAIL');
  };

  const handleSaveNote = useCallback(async (updatedNote: Note) => {
    await storageService.saveNote(updatedNote);
    // Update local state to reflect changes immediately
    setNotes(prev => {
        const idx = prev.findIndex(n => n.id === updatedNote.id);
        if (idx >= 0) {
            const newNotes = [...prev];
            newNotes[idx] = updatedNote;
            return newNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [updatedNote, ...prev];
    });
    // If we are currently editing this note, keep the selectedNote in sync
    setSelectedNote(updatedNote);
  }, []);

  const handleDeleteNote = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
        await storageService.deleteNote(id);
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNote?.id === id) {
            setViewMode('HOME');
            setSelectedNote(null);
        }
    }
  };

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-400">
                <div className="animate-pulse">Loading Chronos...</div>
            </div>
        );
    }

    switch (viewMode) {
      case 'HOME':
        return (
          <NoteList 
            notes={notes} 
            onSelect={handleSelectNote} 
            onCreate={handleCreateNote}
            onDelete={handleDeleteNote}
          />
        );
      case 'DETAIL':
        return selectedNote ? (
          <NoteEditor 
            note={selectedNote} 
            onSave={handleSaveNote} 
            onBack={() => {
                // Ensure latest version is saved/refreshed
                handleSaveNote(selectedNote); 
                setViewMode('HOME');
            }} 
          />
        ) : null;
      case 'STATS':
        return <StatsView notes={notes} onBack={() => setViewMode('HOME')} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar Navigation (Desktop) - Minimalist Strip */}
      <div className="hidden md:flex flex-col items-center w-16 bg-white border-r border-gray-100 py-6 space-y-8 z-20">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">
            C
        </div>
        
        <nav className="flex flex-col space-y-6 w-full items-center">
            <button 
                onClick={() => setViewMode('HOME')}
                className={`p-3 rounded-xl transition ${viewMode === 'HOME' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                title="Notes"
            >
                <Layout size={20} />
            </button>
            <button 
                onClick={() => setViewMode('STATS')}
                className={`p-3 rounded-xl transition ${viewMode === 'STATS' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                title="Statistics"
            >
                <BarChart3 size={20} />
            </button>
        </nav>
      </div>

      {/* Main Area */}
      <main className="flex-1 h-full relative">
        {renderContent()}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-around z-30">
        <button 
            onClick={() => setViewMode('HOME')}
            className={`p-2 rounded-lg ${viewMode === 'HOME' ? 'text-black bg-gray-100' : 'text-gray-400'}`}
        >
            <Layout size={24} />
        </button>
        <button 
             onClick={() => setViewMode('STATS')}
             className={`p-2 rounded-lg ${viewMode === 'STATS' ? 'text-black bg-gray-100' : 'text-gray-400'}`}
        >
            <BarChart3 size={24} />
        </button>
      </div>
    </div>
  );
};

export default App;