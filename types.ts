export enum NoteStatus {
  DRAFT = 'Draft',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export enum NoteCategory {
  WORK = 'Work',
  PERSONAL = 'Personal',
  IDEAS = 'Ideas',
  UNCATEGORIZED = 'Uncategorized'
}

export interface TimeSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number; // in seconds
}

export interface Note {
  id: string;
  title: string;
  content: string;
  status: NoteStatus;
  category: NoteCategory;
  tags: string[];
  totalTime: number; // total accumulated seconds
  sessions: TimeSession[];
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = 'HOME' | 'DETAIL' | 'STATS';

export interface AIResponse {
  text?: string;
  tags?: string[];
  category?: NoteCategory;
  status?: NoteStatus;
  summary?: string;
}
