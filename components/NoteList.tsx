import React, { useState } from 'react';
import { Note, NoteStatus, NoteCategory } from '../types';
import { Clock, Plus, Search, Filter } from 'lucide-react';

interface NoteListProps {
  notes: Note[];
  onSelect: (note: Note) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onSelect, onCreate, onDelete }) => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter(n => {
    const matchesFilter = filter === 'All' ? true : n.status === filter || n.category === filter;
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: NoteStatus) => {
    switch (status) {
      case NoteStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case NoteStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTimeSimple = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Controls */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Notes</h1>
            <button 
                onClick={onCreate}
                className="bg-black text-white p-3 rounded-full hover:bg-gray-800 shadow-lg transition transform hover:scale-105"
            >
                <Plus size={24} />
            </button>
        </div>

        <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search notes..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="relative">
                <div className="absolute left-3 top-3 text-gray-500 pointer-events-none">
                    <Filter size={14} />
                </div>
                <select 
                    className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none cursor-pointer"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="All">All Views</option>
                    <optgroup label="Status">
                        {Object.values(NoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                    <optgroup label="Category">
                        {Object.values(NoteCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                </select>
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 pt-0">
        {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p>No notes found.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => (
                <div 
                    key={note.id} 
                    onClick={() => onSelect(note)}
                    className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition cursor-pointer flex flex-col h-48"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${getStatusColor(note.status)}`}>
                            {note.status}
                        </span>
                        {note.totalTime > 0 && (
                            <div className="flex items-center text-xs text-gray-400">
                                <Clock size={12} className="mr-1" />
                                {formatTimeSimple(note.totalTime)}
                            </div>
                        )}
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{note.title || 'Untitled'}</h3>
                    <p className="text-gray-500 text-sm line-clamp-3 flex-1">
                        {note.content || 'No content...'}
                    </p>

                    <div className="mt-4 flex justify-between items-center border-t border-gray-50 pt-3">
                        <span className="text-xs text-gray-400 font-medium">{note.category}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded"
                            >
                                Delete
                             </button>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default NoteList;