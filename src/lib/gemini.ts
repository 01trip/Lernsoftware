import { GoogleGenerativeAI } from '@google/generative-ai';
import type { User } from '@/lib/types';

export interface Task {
  question: string;
  options: string[];
  correctAnswer: string;
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateTask(user: User): Promise<Task> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Erstelle eine altersgerechte Deutschaufgabe (Lückentext oder Multiple Choice) für ein Kind in der ${user.klasse}. Klasse auf Level ${user.level}. Antworte NUR im JSON Format: { "question": string, "options": string[], "correctAnswer": string }. Die Frage soll kurz und klar sein. Es muss genau 4 Antwortmöglichkeiten geben. Nur eine davon ist korrekt.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as Task;
}
