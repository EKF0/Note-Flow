import React, { useState, useEffect, useCallback } from 'react';
import { storageService } from './services/storageService';
import { Note, ViewMode } from './types';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import StatsView from './components/StatsView';
import GraphView from './components/GraphView';
import { BarChart3, Layout, Lock, Share2 } from 'lucide-react';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeySelected, setApiKeySelected] = useState(false);

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      const data = await storageService.getNotes();
      setNotes(data.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    };
    loadNotes();
  }, []);

  // Check API Key Selection for advanced features
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
      } else {
        // Fallback for dev environment without aistudio wrapper, assume pre-configured
        setApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
          await aistudio.openSelectKey();
          setApiKeySelected(true);
      }
  };

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
    setNotes(prev => {
        const idx = prev.findIndex(n => n.id === updatedNote.id);
        if (idx >= 0) {
            const newNotes = [...prev];
            newNotes[idx] = updatedNote;
            return newNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [updatedNote, ...prev];
    });
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
    
    if (!apiKeySelected) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-800 p-8 text-center">
                <Lock size={48} className="text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Access Required</h2>
                <p className="text-gray-500 mb-6 max-w-md">
                    To use the advanced Gemini AI features (Image Generation, Video Analysis, etc.), 
                    you must select a paid API key.
                </p>
                <button 
                    onClick={handleSelectKey}
                    className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
                >
                    Select API Key
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-blue-500 mt-4 hover:underline">
                    View Billing Documentation
                </a>
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
                handleSaveNote(selectedNote); 
                setViewMode('HOME');
            }} 
            onJumpToNote={handleSelectNote}
          />
        ) : null;
      case 'STATS':
        return <StatsView notes={notes} onBack={() => setViewMode('HOME')} />;
      case 'GRAPH':
        return <GraphView notes={notes} onBack={() => setViewMode('HOME')} onSelectNote={handleSelectNote} />;
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
                onClick={() => setViewMode('GRAPH')}
                className={`p-3 rounded-xl transition ${viewMode === 'GRAPH' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                title="Knowledge Graph"
            >
                <Share2 size={20} />
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
            onClick={() => setViewMode('GRAPH')}
            className={`p-2 rounded-lg ${viewMode === 'GRAPH' ? 'text-black bg-gray-100' : 'text-gray-400'}`}
        >
            <Share2 size={24} />
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
