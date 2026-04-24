export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate: string; // ISO string
  reminderTime?: string; // ISO string
  createdAt: string; // ISO string
}

export type FilterType = 'all' | 'today' | 'upcoming' | 'completed';
