export interface Student {
  id: string;
  course: string;
  name: string;
  gender?: 'male' | 'female';
  image_file?: string;
  present: boolean;
  created_at: string;
}

export interface HistoryRecord {
  id: string;
  student_id: string;
  cycle_number: number;
  selected_at: string;
  course: string;
  student_name: string;
}

export interface AppState {
  id: string;
  current_cycle: number;
  queue: string[]; // array of student ids
  updated_at: string;
}

export interface Game {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  student_count?: number; // populated via join/count
}

export interface GameStudent {
  id: string;
  game_id: string;
  student_id: string;
  role: 'primary' | 'substitute';
  position: number;
  created_at: string;
  student?: Student; // populated via join
}
