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
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const klasse = user.klasse > 0 ? user.klasse : 1;
  const prompt = `Du erstellst eine Deutschaufgabe für ein Kind in Klasse ${klasse} (Grundschule, ca. ${klasse + 5} Jahre alt).

WICHTIGE REGELN:
- Die Frage muss VOLLSTÄNDIG und SELBSTERKLÄREND sein – das Kind sieht NUR den Text, kein Bild, kein Audio.
- Bei Lückentexten: Zeige den vollständigen Satz mit der Lücke direkt in der Frage, z.B. "Der H_nd bellt laut. Welcher Buchstabe fehlt?"
- Bei Wortbedeutung: Erkläre den Kontext direkt, z.B. "Was ist das Gegenteil von 'groß'?"
- Aufgabentypen: einfache Satzergänzung, Gegensätze, Wortbedeutung, Lückensätze, Rechtschreibung
- Klasse 1-2: sehr einfache Wörter, kurze Sätze
- Klasse 3-4: etwas schwieriger, Grammatik, längere Sätze
- Genau 4 Antwortmöglichkeiten, nur eine korrekt

Antworte NUR in diesem JSON Format:
{ "question": string, "options": string[], "correctAnswer": string }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as Task;
}
