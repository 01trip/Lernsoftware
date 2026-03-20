import { GoogleGenerativeAI } from '@google/generative-ai';
import type { User, Task, Subject, DifficultyLevel } from './types';

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error('VITE_GEMINI_API_KEY fehlt in der .env.local Datei!');
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ─── Fach-Konfiguration ────────────────────────────────────────────────────

export const SUBJECT_LABELS: Record<Subject, string> = {
  deutsch:   'Deutsch',
  mathe:     'Mathematik',
  sachkunde: 'Sachkunde',
  englisch:  'Englisch',
};

export const SUBJECT_ICONS: Record<Subject, string> = {
  deutsch:   '📖',
  mathe:     '🔢',
  sachkunde: '🌍',
  englisch:  '🇬🇧',
};

// ─── Schwierigkeit basierend auf Klasse & Fehlerquote ─────────────────────

function getDifficulty(user: User): DifficultyLevel {
  const progress = user.subjectProgress?.find(p => p.subject === user.currentSubject);
  if (!progress || progress.totalAnswered < 3) return 'leicht';
  const accuracy = progress.totalCorrect / progress.totalAnswered;
  if (accuracy >= 0.8) return 'schwer';
  if (accuracy >= 0.5) return 'mittel';
  return 'leicht';
}

// ─── Prompt-Builder je Fach ───────────────────────────────────────────────

function buildPrompt(user: User, difficulty: DifficultyLevel): string {
  const klasse = Math.max(1, Math.min(10, user.klasse));
  const alter = klasse + 5;
  const subject = user.currentSubject;
  const diffLabel = { leicht: 'einfach', mittel: 'mittelschwer', schwer: 'herausfordernd' }[difficulty];

  const baseInstructions = `
Du erstellst eine ${diffLabel}e ${SUBJECT_LABELS[subject]}-Aufgabe für ein Kind in Klasse ${klasse} (ca. ${alter} Jahre alt).

PFLICHTREGELN:
- Die Frage ist VOLLSTÄNDIG und SELBSTERKLÄREND – das Kind sieht nur Text, kein Bild.
- Genau 4 Antwortmöglichkeiten, nur eine ist korrekt.
- "correctAnswer" muss EXAKT einem Text aus "options" entsprechen.
- "explanation" erklärt in 1–2 kindgerechten Sätzen WARUM die Antwort richtig ist.
- "funFact" ist ein kurzer, überraschender Spaßfakt zum Thema (optional, kann leer sein).
- Variiere die Aufgabentypen bei jedem Aufruf.
- Antworte NUR in diesem JSON-Format, ohne Markdown-Backticks.
`;

  const subjectInstructions: Record<Subject, string> = {
    deutsch: `
FACH DEUTSCH – Klasse ${klasse}:
${klasse <= 2
  ? '- Themen: einzelne Buchstaben, einfache Wörter, Reimwörter, Anlaute\n- Beispiel: "Welches Wort reimt sich auf \'Haus\'?"'
  : klasse <= 4
  ? '- Themen: Wortarten, Satzglieder, Groß/Kleinschreibung, Gegensätze, Lückentexte\n- Beispiel: "Der H_nd bellt laut. Welcher Buchstabe fehlt?"'
  : '- Themen: Grammatik, Zeitformen, Konjunktiv, Zeichensetzung, Synonyme, Textanalyse'
}`,
    mathe: `
FACH MATHEMATIK – Klasse ${klasse}:
${klasse <= 2
  ? '- Themen: Zahlen 1–20, einfache Addition/Subtraktion, Mengenbegriffe\n- Beispiel: "Was ist 7 + 5?"'
  : klasse <= 4
  ? '- Themen: Einmaleins, schriftliches Rechnen, einfache Geometrie, Brüche einführen\n- Kein Taschenrechner – kopfrechnen!'
  : klasse <= 6
  ? '- Themen: Brüche, Dezimalzahlen, Prozent, Fläche, Volumen, Gleichungen'
  : '- Themen: Algebra, Geometrie, Statistik, Wahrscheinlichkeit, Funktionen'
}
- Schreibe Rechenwege aus, z.B. "Was ist 3 × 8?"`,
    sachkunde: `
FACH SACHKUNDE – Klasse ${klasse}:
- Themen: Natur, Tiere, Jahreszeiten, Körper, Berufe, Verkehr, Umwelt, Geschichte, Geografie
- Stelle Wissensfragen die zum Entdecken einladen
- Beispiel: "Welches Tier schläft den ganzen Winter?" oder "Was macht ein Fotosynthese?"
- Verwende interessante, überraschende Fakten`,
    englisch: `
FACH ENGLISCH – Klasse ${klasse}:
${klasse <= 2
  ? '- Themen: einfachste englische Wörter (Farben, Zahlen, Tiere)\n- Stelle Fragen auf Deutsch, Antworten auf Englisch'
  : klasse <= 4
  ? '- Themen: Vokabeln, einfache Sätze, Übersetzungen\n- Stelle Fragen auf Deutsch'
  : '- Themen: Grammatik, Vokabeln, Satzstruktur, Übersetzungen, Redewendungen'
}`,
  };

  return `${baseInstructions}${subjectInstructions[subject]}

Antworte NUR in diesem JSON-Format:
{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": "string",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "explanation": "string",
  "funFact": "string"
}`;
}

// ─── Fallback-Aufgaben je Fach ────────────────────────────────────────────

const FALLBACKS: Record<Subject, Task> = {
  deutsch: {
    question: "Was ist das Gegenteil von 'groß'?",
    options: ['klein', 'schnell', 'blau', 'laut'],
    correctAnswer: 'klein',
    subject: 'deutsch',
    difficulty: 'leicht',
    explanation: "Gegensätze nennt man auch Antonyme. 'Klein' ist das Gegenteil von 'groß'.",
    funFact: "Die deutsche Sprache hat über 400.000 Wörter im Wörterbuch! 📚",
  },
  mathe: {
    question: "Was ist 7 × 8?",
    options: ['54', '56', '48', '63'],
    correctAnswer: '56',
    subject: 'mathe',
    difficulty: 'mittel',
    explanation: "7 × 8 = 56. Du kannst es so merken: 5, 6, 7, 8 – 56 = 7 × 8!",
    funFact: "Das Einmaleins hat genau 100 Aufgaben – und du kennst bald alle! 🔢",
  },
  sachkunde: {
    question: "Welches Tier schläft den ganzen Winter?",
    options: ['Bär', 'Hase', 'Schmetterling', 'Storch'],
    correctAnswer: 'Bär',
    subject: 'sachkunde',
    difficulty: 'leicht',
    explanation: "Bären halten Winterschlaf – sie schlafen von Oktober bis März in ihrer Höhle.",
    funFact: "Während des Winterschlafs frisst der Bär gar nichts und lebt von seinem Fettvorrat! 🐻",
  },
  englisch: {
    question: "Was bedeutet das englische Wort 'butterfly'?",
    options: ['Schmetterling', 'Blume', 'Vogel', 'Käfer'],
    correctAnswer: 'Schmetterling',
    subject: 'englisch',
    difficulty: 'leicht',
    explanation: "'Butterfly' ist das englische Wort für Schmetterling.",
    funFact: "In England sagt man 'butterfly', in Amerika auch – Schmetterlinge sind überall beliebt! 🦋",
  },
};

// ─── Haupt-Export ─────────────────────────────────────────────────────────

export async function generateTask(user: User): Promise<Task> {
  const difficulty = getDifficulty(user);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    const prompt = buildPrompt(user, difficulty);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Backticks entfernen falls Gemini sie trotzdem schickt
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(clean) as Task;

  } catch (error) {
    console.error('Fehler bei der KI-Aufgabengenerierung:', error);
    return FALLBACKS[user.currentSubject] ?? FALLBACKS.deutsch;
  }
}
