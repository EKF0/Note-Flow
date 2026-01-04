import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteStatus, NoteCategory, TimeSession, ChatMessage } from '../types';
import { 
  Play, Pause, Save, Mic, MicOff, Wand2, 
  ChevronLeft, Loader2, BrainCircuit, Tag, Check,
  Image as ImageIcon, Video, MapPin, Globe, MessageSquare, Volume2, 
  Sparkles, FileAudio, X, Send, Edit, Plus, Link as LinkIcon,
  Clock, History, StopCircle
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onBack: () => void;
  onJumpToNote?: (note: Note) => void;
}

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const NoteEditor: React.FC<NoteEditorProps> = ({ note: initialNote, onSave, onBack, onJumpToNote }) => {
  const [note, setNote] = useState<Note>(initialNote);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedInSession, setElapsedInSession] = useState(0);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [showTimeLog, setShowTimeLog] = useState(false);
  
  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  
  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Tool Modes
  const [activeTool, setActiveTool] = useState<'NONE' | 'IMG_GEN' | 'IMG_EDIT' | 'VIDEO' | 'AUDIO'>('NONE');
  const [toolInput, setToolInput] = useState("");
  const [selectedImageSize, setSelectedImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setNote(initialNote);
    loadRelatedNotes(initialNote);
  }, [initialNote]);

  useEffect(() => {
    const timer = setTimeout(() => handleSave(), 2000);
    return () => clearTimeout(timer);
  }, [note.title, note.content, note.status, note.category, note.tags]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => setElapsedInSession(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadRelatedNotes = async (currentNote: Note) => {
      const allNotes = await storageService.getNotes();
      const related = allNotes.filter(n => 
          n.id !== currentNote.id && 
          n.tags.some(tag => currentNote.tags.includes(tag))
      );
      setRelatedNotes(related.slice(0, 5));
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
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
        sessions: [newSession, ...prev.sessions]
      }));
      setIsTimerRunning(false);
      setElapsedInSession(0);
      setSessionStartTime(null);
    } else {
      setIsTimerRunning(true);
      setSessionStartTime(Date.now());
    }
  };

  const handleSave = () => {
    onSave(note);
  };

  // --- AI ACTIONS ---
  const handleCategorize = async () => {
    setAiLoading(true);
    const result = await geminiService.categorizeAndPredict(note.content, note.title);
    setNote(prev => ({
      ...prev,
      category: result.category,
      status: result.status,
      tags: [...Array.from(new Set([...prev.tags, ...result.tags]))]
    }));
    setAiLoading(false);
    loadRelatedNotes({...note, tags: [...Array.from(new Set([...note.tags, ...result.tags]))]});
  };

  const handleSummarize = async () => {
    setAiLoading(true);
    const summary = await geminiService.summarizeNote(note.content);
    setAiSuggestion(`**Summary:**\n${summary}`);
    setAiLoading(false);
  };

  const handleThinkingMode = async () => {
    setAiLoading(true);
    const result = await geminiService.complexThinking(
        `Analyze this note deeply and provide a strategic plan or insight:\n\n${note.content}`
    );
    setAiSuggestion(`**Deep Analysis:**\n${result}`);
    setAiLoading(false);
  };

  const handleSearch = async () => {
      const q = prompt("What do you want to research?");
      if (!q) return;
      setAiLoading(true);
      const result = await geminiService.searchGrounding(q);
      setNote(prev => ({...prev, content: prev.content + `\n\n### Research: ${q}\n${result}`}));
      setAiLoading(false);
  };

  const handleMaps = async () => {
      const q = prompt("What place are you looking for?");
      if (!q) return;
      setAiLoading(true);
      let location = undefined;
      if (navigator.geolocation) {
          try {
            const pos: GeolocationPosition = await new Promise((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject)
            );
            location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          } catch (e) { console.log("No location access"); }
      }
      const result = await geminiService.mapGrounding(q, location);
      setNote(prev => ({...prev, content: prev.content + `\n\n### Map Info: ${q}\n${result}`}));
      setAiLoading(false);
  };

  const handleTTS = async () => {
    setAiLoading(true);
    const textToRead = window.getSelection()?.toString() || note.content.slice(0, 500); 
    if (!textToRead) { setAiLoading(false); return; }
    const audioData = await geminiService.generateSpeech(textToRead);
    if (audioData) {
        const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
        audio.play();
    }
    setAiLoading(false);
  };

  const handleToolSubmit = async () => {
      setAiLoading(true);
      try {
          if (activeTool === 'IMG_GEN') {
              const base64 = await geminiService.generateImage(toolInput, selectedImageSize);
              if (base64) {
                  setNote(prev => ({ ...prev, content: prev.content + `\n\n![Generated Image](${base64})` }));
              }
          } else if (activeTool === 'IMG_EDIT' && uploadFile) {
              const base64 = await fileToBase64(uploadFile);
              const result = await geminiService.editImage(base64, toolInput);
              if (result) {
                  setNote(prev => ({ ...prev, content: prev.content + `\n\n![Edited Image](${result})` }));
              }
          } else if (activeTool === 'VIDEO' && uploadFile) {
              const base64 = await fileToBase64(uploadFile);
              const result = await geminiService.analyzeVideo(base64, uploadFile.type, toolInput);
              setNote(prev => ({ ...prev, content: prev.content + `\n\n### Video Analysis\n${result}` }));
          }
      } catch (e: any) {
          console.error(e);
          alert("Operation failed. Ensure your API key is selected and try again.");
      } finally {
          setAiLoading(false);
          setActiveTool('NONE');
          setUploadFile(null);
          setToolInput("");
      }
  };

  const toggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];
              mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
              mediaRecorder.onstop = async () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                  const reader = new FileReader();
                  reader.readAsDataURL(audioBlob);
                  reader.onloadend = async () => {
                      const base64 = reader.result as string;
                      setAiLoading(true);
                      const text = await geminiService.transcribeAudio(base64, audioBlob.type || 'audio/webm');
                      setNote(prev => ({ ...prev, content: prev.content + " " + text }));
                      setAiLoading(false);
                  }
              };
              mediaRecorder.start();
              setIsRecording(true);
          } catch (e) {
              alert("Microphone access denied");
          }
      }
  };

  const sendChatMessage = async () => {
      if (!chatInput.trim()) return;
      const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput("");
      setChatLoading(true);
      const apiHistory = chatHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
      const response = await geminiService.chatMessage(apiHistory, userMsg.text);
      setChatHistory(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
      setChatLoading(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  return (
    <div className={`flex flex-col h-full bg-white relative transition-colors duration-500 ${isTimerRunning ? 'bg-orange-50/20' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10 sticky top-0">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition">
            <ChevronLeft size={20} />
          </button>
          
          <select 
            value={note.status}
            onChange={(e) => setNote({...note, status: e.target.value as NoteStatus})}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border-none outline-none appearance-none cursor-pointer
              ${note.status === NoteStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                note.status === NoteStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}
          >
            {Object.values(NoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-2">
            <div 
              onClick={toggleTimer}
              className={`flex items-center px-4 py-2 rounded-full cursor-pointer transition-all duration-300 shadow-sm
                ${isTimerRunning ? 'bg-orange-500 text-white animate-pulse shadow-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
                {isTimerRunning ? <StopCircle size={18} className="mr-2" /> : <Play size={18} className="mr-2" />}
                <span className="font-mono text-sm font-bold tracking-wider">
                    {formatDuration(note.totalTime + elapsedInSession)}
                </span>
            </div>
            <button onClick={() => setShowTimeLog(!showTimeLog)} className={`p-2 rounded-full transition ${showTimeLog ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                <History size={20} />
            </button>
            <button onClick={handleSave} className="p-2 text-gray-400 hover:text-blue-600">
                <Save size={20} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 max-w-4xl mx-auto w-full">
            <input 
                type="text" 
                placeholder="Untitled"
                value={note.title}
                onChange={(e) => setNote({...note, title: e.target.value})}
                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-6"
            />
            
            <textarea
                placeholder="Start typing..."
                value={note.content}
                onChange={(e) => setNote({...note, content: e.target.value})}
                className="w-full h-[calc(100%-80px)] resize-none text-lg text-gray-700 leading-relaxed border-none outline-none bg-transparent focus:ring-0 font-mono"
            />
          </div>

          {/* AI / Tools Sidebar */}
          <div className="w-80 border-l border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-6 overflow-y-auto hidden xl:flex">
             
             {/* Section: Time Log (Dynamic) */}
             {showTimeLog && (
                <div className="space-y-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm animate-in slide-in-from-right-2">
                   <div className="flex justify-between items-center mb-1">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={12}/> Focus Sessions
                       </h3>
                       <button onClick={() => setShowTimeLog(false)}><X size={14} className="text-gray-400"/></button>
                   </div>
                   <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                       {note.sessions.length === 0 ? (
                           <p className="text-[10px] text-gray-400 italic py-2">No focus sessions recorded yet.</p>
                       ) : (
                           note.sessions.map(s => (
                               <div key={s.id} className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center group">
                                   <div>
                                       <span className="text-[10px] font-bold text-gray-800 block">{formatDate(s.startTime)}</span>
                                       <span className="text-[9px] text-gray-400">{formatTime(s.startTime)} - {s.endTime ? formatTime(s.endTime) : '...'}</span>
                                   </div>
                                   <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                       {formatDuration(s.duration)}
                                   </span>
                               </div>
                           ))
                       )}
                   </div>
                </div>
             )}

             {/* Section: Linked Content */}
             {relatedNotes.length > 0 && (
                <div className="space-y-2">
                   <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                       <LinkIcon size={12}/> Related Notes
                    </h3>
                   <div className="flex flex-col gap-2">
                       {relatedNotes.map(rn => (
                           <button 
                             key={rn.id}
                             onClick={() => onJumpToNote?.(rn)}
                             className="text-left p-2 bg-white rounded-lg border border-gray-200 text-xs hover:border-blue-400 transition truncate group"
                           >
                               <span className="font-semibold block truncate group-hover:text-blue-600">{rn.title || 'Untitled'}</span>
                               <span className="text-[10px] text-gray-400">{rn.category}</span>
                           </button>
                       ))}
                   </div>
                </div>
             )}

             {/* Section: Quick Actions */}
             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Smart Assist</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleCategorize} disabled={aiLoading} className="tool-btn">
                        <Tag size={14} className="text-purple-500" />
                        <span>Categorize</span>
                    </button>
                    <button onClick={handleSummarize} disabled={aiLoading} className="tool-btn">
                        <Wand2 size={14} className="text-blue-500" />
                        <span>Summary</span>
                    </button>
                    <button onClick={handleThinkingMode} disabled={aiLoading} className="tool-btn col-span-2">
                        <BrainCircuit size={14} className="text-orange-500" />
                        <span>Deep Analysis (Think)</span>
                    </button>
                </div>
             </div>

             {/* Section: Create */}
             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Creation Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setActiveTool('IMG_GEN')} disabled={aiLoading} className="tool-btn">
                        <ImageIcon size={14} className="text-pink-500" />
                        <span>Gen Image</span>
                    </button>
                    <button onClick={() => setActiveTool('IMG_EDIT')} disabled={aiLoading} className="tool-btn">
                        <Edit size={14} className="text-indigo-500" />
                        <span>Edit Image</span>
                    </button>
                    <button onClick={() => setActiveTool('VIDEO')} disabled={aiLoading} className="tool-btn">
                        <Video size={14} className="text-red-500" />
                        <span>Analyze Vid</span>
                    </button>
                    <button onClick={toggleRecording} className={`tool-btn ${isRecording ? 'bg-red-100 border-red-300' : ''}`}>
                        {isRecording ? <Loader2 size={14} className="animate-spin text-red-600"/> : <Mic size={14} className="text-red-500" />}
                        <span>{isRecording ? 'Stop' : 'Audio Note'}</span>
                    </button>
                </div>
                <button onClick={handleTTS} disabled={aiLoading} className="tool-btn w-full mt-2">
                    <Volume2 size={14} className="text-green-600" />
                    <span>Read Aloud</span>
                </button>
             </div>

             {/* Section: Research */}
             <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Grounding</h3>
                <div className="flex flex-col gap-2">
                    <button onClick={handleSearch} disabled={aiLoading} className="tool-btn w-full">
                        <Globe size={14} className="text-blue-600" />
                        <span>Google Search</span>
                    </button>
                    <button onClick={handleMaps} disabled={aiLoading} className="tool-btn w-full">
                        <MapPin size={14} className="text-emerald-600" />
                        <span>Google Maps</span>
                    </button>
                </div>
             </div>

             {/* AI Suggestion Box */}
             {aiSuggestion && (
                 <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-center mb-2">
                         <span className="font-semibold text-purple-600 text-xs">AI Insight</span>
                         <button onClick={() => setAiSuggestion(null)} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                     </div>
                     <div className="whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
                         {aiSuggestion}
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* Floating Chat Button */}
      <button 
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-110 transition z-50 flex items-center justify-center"
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Overlay */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom-5">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500"/>
                    Gemini Pro Chat
                </h3>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {chatLoading && <div className="text-gray-400 text-xs italic ml-2">Gemini is thinking...</div>}
            </div>
            <div className="p-3 border-t border-gray-100 flex gap-2">
                <input 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-black"
                    placeholder="Ask anything..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                />
                <button onClick={sendChatMessage} disabled={chatLoading} className="p-2 bg-black text-white rounded-full hover:bg-gray-800">
                    <Send size={16} />
                </button>
            </div>
        </div>
      )}

      {/* Tool Modal Overlay */}
      {activeTool !== 'NONE' && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">
                          {activeTool === 'IMG_GEN' && 'Generate Image'}
                          {activeTool === 'IMG_EDIT' && 'Edit Image'}
                          {activeTool === 'VIDEO' && 'Analyze Video'}
                      </h3>
                      <button onClick={() => setActiveTool('NONE')}><X size={20} className="text-gray-400"/></button>
                  </div>

                  <div className="space-y-4">
                      {activeTool === 'IMG_GEN' && (
                          <div className="flex gap-2">
                              {['1K', '2K', '4K'].map((size) => (
                                  <button 
                                    key={size}
                                    onClick={() => setSelectedImageSize(size as any)}
                                    className={`flex-1 py-1 text-sm border rounded-md ${selectedImageSize === size ? 'bg-black text-white border-black' : 'border-gray-200'}`}
                                  >
                                    {size}
                                  </button>
                              ))}
                          </div>
                      )}

                      {(activeTool === 'IMG_EDIT' || activeTool === 'VIDEO') && (
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer relative">
                              <input 
                                type="file" 
                                accept={activeTool === 'VIDEO' ? "video/*" : "image/*"}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                              />
                              {uploadFile ? (
                                  <div className="text-sm font-medium text-green-600">{uploadFile.name}</div>
                              ) : (
                                  <div className="text-gray-400 text-sm">
                                      <Plus size={24} className="mx-auto mb-2"/>
                                      Click to upload {activeTool === 'VIDEO' ? 'video' : 'image'}
                                  </div>
                              )}
                          </div>
                      )}

                      <textarea 
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        rows={3}
                        placeholder={activeTool === 'IMG_GEN' ? "Describe the image..." : "Describe what to do..."}
                        value={toolInput}
                        onChange={(e) => setToolInput(e.target.value)}
                      />

                      <button 
                        onClick={handleToolSubmit} 
                        disabled={aiLoading}
                        className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {aiLoading && <Loader2 size={16} className="animate-spin" />}
                        {activeTool === 'IMG_GEN' ? 'Generate' : 'Process'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Styles for sidebar buttons */}
      <style>{`
        .tool-btn {
            @apply flex items-center gap-2 p-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition justify-start;
        }
      `}</style>
    </div>
  );
};

export default NoteEditor;
