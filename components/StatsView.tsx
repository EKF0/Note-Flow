import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Note, NoteCategory } from '../types';
import { Clock, CheckCircle } from 'lucide-react';

interface StatsViewProps {
  notes: Note[];
  onBack: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatsView: React.FC<StatsViewProps> = ({ notes, onBack }) => {
  
  const totalTimeAllNotes = useMemo(() => {
    return notes.reduce((acc, note) => acc + note.totalTime, 0);
  }, [notes]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(NoteCategory).forEach(c => counts[c] = 0);
    
    notes.forEach(note => {
      counts[note.category] = (counts[note.category] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [notes]);

  const timePerDayData = useMemo(() => {
    // A simplified view: Time accumulated by update date (since session logic can be complex)
    const days: Record<string, number> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString()] = 0;
    }

    // In a real app, we would flatten all 'sessions' from all notes.
    // Here we will distribute the 'totalTime' of a note to its 'updatedAt' day for a rough approximation
    // OR ideally use the sessions array if populated correctly.
    
    notes.forEach(note => {
        note.sessions.forEach(session => {
            const dateStr = new Date(session.startTime).toLocaleDateString();
            if (days[dateStr] !== undefined) {
                days[dateStr] += session.duration / 60; // Minutes
            }
        })
    });

    return Object.entries(days).map(([name, value]) => ({ name, minutes: Math.round(value) }));
  }, [notes]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="flex items-center mb-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 mr-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Productivity Stats</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Focus Time</p>
              <h3 className="text-2xl font-bold">{formatTime(totalTimeAllNotes)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Notes</p>
              <h3 className="text-2xl font-bold">{notes.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="text-lg font-semibold mb-4">Focus Time (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timePerDayData}>
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="text-lg font-semibold mb-4">Notes by Category</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center">
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;