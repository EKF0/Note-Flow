import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteStatus, NoteCategory, TimeSession } from '../types';
import { 
  Play, Pause, Save, Mic, MicOff, Wand2, 
  ChevronLeft, Loader2, BrainCircuit, Tag, Check
} from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onBack: () => void;
}

// Helper to format time HH:MM:SS
const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const NoteEditor: React.FC<NoteEditorProps> = ({ note: initialNote, onSave, onBack }) => {
  const [note, setNote] = useState<Note>(initialNote);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedInSession, setElapsedInSession] = useState(0);
  
  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-save debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.title, note.content, note.status, note.category]);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedInSession(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
             setNote(prev => ({ ...prev, content: prev.content + ' ' + finalTranscript }));
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
          console.error("Speech error", event);
          setIsListening(false);
      }
    }
  }, []);

  const toggleTimer = () => {
    if (isTimerRunning) {
      // Stop Timer
      setIsTimerRunning(false);
      const now = Date.now();
      const duration = elapsedInSession;
      
      const newSession: TimeSession = {
        id: crypto.randomUUID(),
        startTime: sessionStartTime!,
        endTime: now,
        duration: duration
      };

      setNote(prev => ({
        ...prev,
        totalTime: prev.totalTime + duration,
        sessions: [...prev.sessions, newSession]
      }));
      setElapsedInSession(0);
      setSessionStartTime(null);
    } else {
      // Start Timer
      setIsTimerRunning(true);
      setSessionStartTime(Date.now());
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSave = () => {
    // If timer is running, we don't commit the *current session* time to totalTime yet,
    // only when stopped. But we save the text changes.
    onSave(note);
  };

  const handleAIAnalyze = async () => {
    setAiLoading(true);
    const result = await geminiService.categorizeAndPredict(note.content, note.title);
    setNote(prev => ({
      ...prev,
      category: result.category,
      status: result.status,
      tags: [...Array.from(new Set([...prev.tags, ...result.tags]))]
    }));
    setAiLoading(false);
  };

  const handleAISummarize = async () => {
    setAiLoading(true);
    const summary = await geminiService.summarizeNote(note.content);
    setAiSuggestion(`**Summary:**\n${summary}`);
    setAiLoading(false);
  };

  const handleAISuggest = async () => {
    setAiLoading(true);
    const suggestions = await geminiService.suggestImprovements(note.content);
    setAiSuggestion(`**Suggestions:**\n${suggestions}`);
    setAiLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10 sticky top-0">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition">
            <ChevronLeft size={20} />
          </button>
          
          {/* Status Dropdown */}
          <select 
            value={note.status}
            onChange={(e) => setNote({...note, status: e.target.value as NoteStatus})}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border-none outline-none appearance-none cursor-pointer
              ${note.status === NoteStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                note.status === NoteStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}
          >
            {Object.values(NoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

           {/* Category Dropdown */}
           <select 
            value={note.category}
            onChange={(e) => setNote({...note, category: e.target.value as NoteCategory})}
            className="text-xs font-medium text-gray-500 bg-transparent outline-none cursor-pointer hover:text-gray-800"
          >
            {Object.values(NoteCategory).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-2">
            {/* Timer Control */}
            <div className={`flex items-center px-3 py-1.5 rounded-full transition-colors ${isTimerRunning ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                <span className="font-mono text-sm font-medium mr-2">
                    {formatDuration(note.totalTime + elapsedInSession)}
                </span>
                <button onClick={toggleTimer} className="focus:outline-none">
                    {isTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
            </div>

            <button onClick={handleSave} className="p-2 text-gray-400 hover:text-blue-600">
                <Save size={20} />
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 max-w-4xl mx-auto w-full">
            <input 
                type="text" 
                placeholder="Untitled"
                value={note.title}
                onChange={(e) => setNote({...note, title: e.target.value})}
                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-6"
            />
            
            <textarea
                placeholder="Start typing or use voice..."
                value={note.content}
                onChange={(e) => setNote({...note, content: e.target.value})}
                className="w-full h-[calc(100%-80px)] resize-none text-lg text-gray-700 leading-relaxed border-none outline-none bg-transparent focus:ring-0"
            />
          </div>

          {/* AI / Tools Sidebar */}
          <div className="w-64 border-l border-gray-100 bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto hidden lg:flex">
             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Assistant</h3>
                <button 
                    disabled={aiLoading}
                    onClick={handleAIAnalyze}
                    className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition"
                >
                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} className="text-purple-500" />}
                    <span>Auto-Categorize</span>
                </button>
                <button 
                    disabled={aiLoading}
                    onClick={handleAISummarize}
                    className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
                >
                    <Wand2 size={14} className="text-blue-500" />
                    <span>Summarize</span>
                </button>
                <button 
                    disabled={aiLoading}
                    onClick={handleAISuggest}
                    className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition"
                >
                    <Check size={14} className="text-green-500" />
                    <span>Suggestions</span>
                </button>
             </div>

             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dictation</h3>
                <button 
                    onClick={toggleVoice}
                    className={`w-full flex items-center gap-2 p-2 text-sm border rounded-lg transition
                        ${isListening ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    <span>{isListening ? 'Stop Listening' : 'Start Dictation'}</span>
                </button>
             </div>

             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                    {note.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md">
                            <Tag size={10} className="mr-1" />
                            {tag}
                        </span>
                    ))}
                    {note.tags.length === 0 && <span className="text-xs text-gray-400 italic">No tags</span>}
                </div>
             </div>

             {aiSuggestion && (
                 <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-center mb-2">
                         <span className="font-semibold text-purple-600 text-xs">AI Result</span>
                         <button onClick={() => setAiSuggestion(null)} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                     </div>
                     <div className="whitespace-pre-line text-xs">
                         {aiSuggestion}
                     </div>
                 </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default NoteEditor;