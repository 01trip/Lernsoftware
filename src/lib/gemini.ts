import { GoogleGenerativeAI } from '@google/generative-ai';
import type { User } from './types'; // Passe den Pfad an, falls eure types.ts woanders liegt

export interface Task {
  question: string;
  options: string[];
  correctAnswer: string;
}

// Wirft sofort einen klaren Fehler, falls der Key in der .env vergessen wurde
if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY fehlt in der .env.local Datei!");
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateTask(user: User): Promise<Task> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9, // WICHTIG: Sorgt dafür, dass nicht immer die gleichen Fragen kommen!
      },
    });

    const klasse = user.klasse > 0 ? user.klasse : 1;
    const prompt = `Du erstellst eine Deutschaufgabe für ein Kind in Klasse ${klasse} (Grundschule, ca. ${klasse + 5} Jahre alt).

    WICHTIGE REGELN:
    - Die Frage muss VOLLSTÄNDIG und SELBSTERKLÄREND sein – das Kind sieht NUR den Text, kein Bild.
    - Bei Lückentexten: Zeige den vollständigen Satz mit der Lücke direkt in der Frage, z.B. "Der H_nd bellt laut. Welcher Buchstabe fehlt?"
    - Bei Wortbedeutung: Erkläre den Kontext direkt, z.B. "Was ist das Gegenteil von 'groß'?"
    - Aufgabentypen: einfache Satzergänzung, Gegensätze, Wortbedeutung, Lückensätze, Rechtschreibung. Variiere die Themen (Tiere, Natur, Schule, Alltag).
    - Klasse 1-2: sehr einfache Wörter, kurze Sätze.
    - Klasse 3-4: etwas schwieriger, Grammatik, längere Sätze.
    - Genau 4 Antwortmöglichkeiten, nur eine ist korrekt.
    - Stelle sicher, dass "correctAnswer" exakt einem der Texte aus "options" entspricht.

    Antworte NUR in diesem JSON Format:
    { "question": "string", "options": ["string"], "correctAnswer": "string" }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as Task;

  } catch (error) {
    console.error("Fehler bei der KI-Aufgabengenerierung:", error);
    // Das Sicherheitsnetz: Falls das Internet weg ist, crasht die App nicht.
    return {
      question: "Oh je, das Internet hakt kurz! Lass uns eine einfache Aufgabe machen: Was ist das Gegenteil von 'klein'?",
      options: ["groß", "schnell", "blau", "laut"],
      correctAnswer: "groß"
    };
  }
}