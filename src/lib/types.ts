import type { RecordModel } from 'pocketbase';

export type Subject = 'deutsch' | 'mathe' | 'sachkunde' | 'englisch';

export type DifficultyLevel = 'leicht' | 'mittel' | 'schwer';

export interface SubjectProgress {
  subject: Subject;
  xp: number;
  correctStreak: number;
  totalAnswered: number;
  totalCorrect: number;
}

export interface User extends RecordModel {
  name: string;
  klasse: number;
  xp: number;
  level: number;
  currentSubject: Subject;
  subjectProgress: SubjectProgress[];
  interests: string[];
  lastActiveDate: string;
  loginStreak: number;
}

export interface Task {
  question: string;
  options: string[];
  correctAnswer: string;
  subject: Subject;
  difficulty: DifficultyLevel;
  explanation?: string;
  funFact?: string;
}

export interface TaskResult {
  taskId: string;
  subject: Subject;
  correct: boolean;
  timeToAnswerMs: number;
  answeredAt: string;
}
