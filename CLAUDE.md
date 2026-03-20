# LernAbenteuer – Claude Code Projektdatei

## Projektübersicht

Adaptive KI-Lernsoftware für Kinder. React 19 + TypeScript + Vite + Tailwind +
Framer Motion + PocketBase (Backend/DB) + Google Gemini API (KI-Aufgaben).

**Aktueller Stand:** Sprint 1 abgeschlossen – Onboarding, Gamification (XP/Level), KI-Aufgaben (nur Deutsch, Klasse 1–4).

---

## Sofort-Fixes (Bugs & Sicherheit)

### FIX 1 – SQL-Injection in OnboardingScreen.tsx beheben

**Datei:** `src/features/onboarding/OnboardingScreen.tsx`

Ersetze den unsicheren Filter:
```ts
// VORHER (unsicher):
const existingUsers = await pb.collection('users').getList(1, 1, {
  filter: `name = "${name}" && klasse = ${klasse}`
});

// NACHHER (sicher):
const existingUsers = await pb.collection('users').getList(1, 1, {
  filter: 'name = {:name} && klasse = {:klasse}',
  params: { name, klasse }
});
```

### FIX 2 – XP/Level-Bug in TaskView.tsx beheben

**Datei:** `src/features/learning/TaskView.tsx`

Das XP-System muss kumulativ richtig berechnet werden:
```ts
// VORHER (buggy – XP wächst unbegrenzt, Level-Schwelle stimmt nicht):
const newXp = user.xp + 10;
const nextLevelThreshold = user.level * 100;
let newLevel = user.level;
if (newXp >= nextLevelThreshold) {
  newLevel = user.level + 1;
  setLeveledUp(true);
}

// NACHHER (korrekt – XP pro Level, nicht kumulativ):
const XP_PER_LEVEL = 100;
const newXp = user.xp + 10;
const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
if (newLevel > user.level) {
  setLeveledUp(true);
}
// Progress innerhalb des aktuellen Levels:
// xpInCurrentLevel = newXp % XP_PER_LEVEL
// progress = (xpInCurrentLevel / XP_PER_LEVEL) * 100
```

Passe auch `HeaderDash.tsx` an:
```ts
// VORHER:
const nextLevelXp = currentLevel * 100;
const progress = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

// NACHHER:
const XP_PER_LEVEL = 100;
const xpInCurrentLevel = currentXp % XP_PER_LEVEL;
const progress = Math.round((xpInCurrentLevel / XP_PER_LEVEL) * 100);
const nextLevelXp = XP_PER_LEVEL; // immer 100 XP pro Level
```

---

## Sprint 2 – Fach-System & erweitertes Onboarding

### AUFGABE: Neue Typen in `src/lib/types.ts`

Ersetze die gesamte Datei:
```ts
import type { RecordModel } from 'pocketbase';

export type Subject = 'deutsch' | 'mathe' | 'sachkunde' | 'englisch';

export type DifficultyLevel = 'leicht' | 'mittel' | 'schwer';

export interface SubjectProgress {
  subject: Subject;
  xp: number;
  correctStreak: number;   // aktuelle Korrekt-Serie
  totalAnswered: number;
  totalCorrect: number;
}

export interface User extends RecordModel {
  name: string;
  klasse: number;           // 1–10
  xp: number;              // Gesamt-XP
  level: number;
  currentSubject: Subject; // aktuell gewähltes Fach
  subjectProgress: SubjectProgress[]; // Fortschritt je Fach
  interests: string[];     // z.B. ['tiere', 'sport', 'bauen']
  lastActiveDate: string;  // ISO-String, für Streak-Berechnung
  loginStreak: number;     // Tage in Folge aktiv
}

export interface Task {
  question: string;
  options: string[];
  correctAnswer: string;
  subject: Subject;
  difficulty: DifficultyLevel;
  explanation?: string;    // Erklärung nach falscher Antwort
  funFact?: string;        // optionaler Spaßfakt nach richtiger Antwort
}

export interface TaskResult {
  taskId: string;
  subject: Subject;
  correct: boolean;
  timeToAnswerMs: number;
  answeredAt: string;
}
```

### AUFGABE: Gemini-Service komplett neu in `src/lib/gemini.ts`

Ersetze die gesamte Datei:
```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { User, Task, Subject, DifficultyLevel } from './types';

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error('VITE_GEMINI_API_KEY fehlt in der .env.local Datei!');
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ─── Fach-Konfiguration ────────────────────────────────────────────────────

const SUBJECT_LABELS: Record<Subject, string> = {
  deutsch:    'Deutsch',
  mathe:      'Mathematik',
  sachkunde:  'Sachkunde',
  englisch:   'Englisch',
};

const SUBJECT_ICONS: Record<Subject, string> = {
  deutsch:    '📖',
  mathe:      '🔢',
  sachkunde:  '🌍',
  englisch:   '🇬🇧',
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
- "explanation" erklärt in 1–2 Kindgerechten Sätzen WARUM die Antwort richtig ist.
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
    options: ['klein', 'schnell', 'laut', 'warm'],
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

export { SUBJECT_LABELS, SUBJECT_ICONS };
```

---

## Sprint 2 – Neue UI-Komponenten

### AUFGABE: Fach-Auswahl-Komponente erstellen

Neue Datei: `src/features/learning/SubjectSelector.tsx`
```tsx
import { motion } from 'framer-motion';
import { SUBJECT_LABELS, SUBJECT_ICONS } from '@/lib/gemini';
import type { Subject } from '@/lib/types';

interface Props {
  current: Subject;
  onChange: (subject: Subject) => void;
}

const SUBJECTS: Subject[] = ['deutsch', 'mathe', 'sachkunde', 'englisch'];

const SUBJECT_COLORS: Record<Subject, { bg: string; border: string; text: string; shadow: string }> = {
  deutsch:   { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-700',   shadow: 'shadow-[0_4px_0_0_#93c5fd]' },
  mathe:     { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  shadow: 'shadow-[0_4px_0_0_#86efac]' },
  sachkunde: { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-700',  shadow: 'shadow-[0_4px_0_0_#fcd34d]' },
  englisch:  { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', shadow: 'shadow-[0_4px_0_0_#c4b5fd]' },
};

export function SubjectSelector({ current, onChange }: Props) {
  return (
    <div className="mb-6 flex gap-3 flex-wrap justify-center">
      {SUBJECTS.map((subject) => {
        const isActive = subject === current;
        const colors = SUBJECT_COLORS[subject];
        return (
          <motion.button
            key={subject}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(subject)}
            className={`flex items-center gap-2 rounded-2xl border-4 px-5 py-3 font-bold text-lg transition-all
              ${isActive
                ? `${colors.bg} ${colors.border} ${colors.text} ${colors.shadow}`
                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
          >
            <span>{SUBJECT_ICONS[subject]}</span>
            {SUBJECT_LABELS[subject]}
          </motion.button>
        );
      })}
    </div>
  );
}
```

### AUFGABE: OnboardingScreen.tsx erweitern (Klasse 1–10 + Interessen)

Ersetze die gesamte Datei `src/features/onboarding/OnboardingScreen.tsx`:
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pb } from '@/lib/pb';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User, Subject } from '@/lib/types';

interface Props {
  onComplete: (user: User) => void;
}

const INTERESTS = [
  { id: 'tiere',    label: 'Tiere',     emoji: '🐾' },
  { id: 'sport',    label: 'Sport',     emoji: '⚽' },
  { id: 'bauen',    label: 'Bauen',     emoji: '🔨' },
  { id: 'natur',    label: 'Natur',     emoji: '🌿' },
  { id: 'kochen',   label: 'Kochen',    emoji: '🍕' },
  { id: 'musik',    label: 'Musik',     emoji: '🎵' },
  { id: 'technik',  label: 'Technik',   emoji: '🤖' },
  { id: 'kunst',    label: 'Kunst',     emoji: '🎨' },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [klasse, setKlasse] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Sicherer Filter – kein SQL-Injection-Risiko
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: 'name = {:name} && klasse = {:klasse}',
        params: { name, klasse },
      });

      const defaultSubject: Subject = 'deutsch';

      if (existingUsers.items.length > 0) {
        onComplete(existingUsers.items[0] as User);
      } else {
        const newUser = await pb.collection('users').create({
          name,
          klasse,
          xp: 0,
          level: 1,
          currentSubject: defaultSubject,
          subjectProgress: [],
          interests,
          lastActiveDate: new Date().toISOString(),
          loginStreak: 1,
        });
        onComplete(newUser as User);
      }
    } catch (err) {
      console.error(err);
      alert('Fehler beim Erstellen des Profils. Bitte nochmal versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6">
      <motion.div
        layout
        className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl xl:p-12"
      >
        {/* Fortschrittsbalken */}
        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-500
              ${step >= s ? 'bg-indigo-400' : 'bg-gray-100'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Schritt 1: Name */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
              <h1 className="mb-4 text-center font-bold text-4xl text-purple-600">Hallo! 👋</h1>
              <p className="mb-8 text-center text-xl text-gray-500">Wie heißt du?</p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                placeholder="Dein Vorname"
                className="mb-8 w-full rounded-2xl border-4 border-indigo-100 bg-indigo-50 px-6 py-4 text-center text-2xl font-bold text-indigo-900 outline-none transition-all placeholder:text-indigo-300 focus:border-indigo-400 focus:bg-white"
                autoFocus
              />
              <Button onClick={() => setStep(2)} disabled={!name.trim()}
                className="flex w-full items-center justify-center rounded-2xl bg-indigo-500 py-6 text-2xl font-bold text-white shadow-[0_8px_0_0_#4338ca] hover:-translate-y-1 hover:bg-indigo-400 disabled:opacity-50">
                Weiter <ArrowRight className="ml-2 h-8 w-8" />
              </Button>
            </motion.div>
          )}

          {/* Schritt 2: Klasse (1–10) */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
              <h1 className="mb-4 text-center font-bold text-4xl text-pink-500">Toll, {name}! 🌟</h1>
              <p className="mb-6 text-center text-xl text-gray-500">In welche Klasse gehst du?</p>
              <div className="mb-8 grid grid-cols-5 gap-3">
                {[1,2,3,4,5,6,7,8,9,10].map(k => (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    key={k} onClick={() => setKlasse(k)}
                    className={`flex h-16 items-center justify-center rounded-2xl border-4 font-bold text-2xl transition-all
                      ${klasse === k ? 'border-pink-500 bg-pink-100 text-pink-600 shadow-[0_4px_0_0_#ec4899]' : 'border-pink-100 bg-white text-pink-300 hover:border-pink-300'}`}
                  >{k}.</motion.button>
                ))}
              </div>
              <Button onClick={() => setStep(3)}
                className="flex w-full items-center justify-center rounded-2xl bg-pink-500 py-6 text-2xl font-bold text-white shadow-[0_8px_0_0_#be185d] hover:-translate-y-1">
                Weiter <ArrowRight className="ml-2 h-8 w-8" />
              </Button>
            </motion.div>
          )}

          {/* Schritt 3: Interessen */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
              <h1 className="mb-4 text-center font-bold text-4xl text-green-500">Fast fertig! 🎉</h1>
              <p className="mb-6 text-center text-lg text-gray-500">Was magst du am liebsten?<br/><span className="text-sm">(Wähle so viele du möchtest)</span></p>
              <div className="mb-8 grid grid-cols-4 gap-3">
                {INTERESTS.map(interest => {
                  const isSelected = interests.includes(interest.id);
                  return (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      key={interest.id} onClick={() => toggleInterest(interest.id)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border-4 p-3 font-bold text-sm transition-all
                        ${isSelected ? 'border-green-400 bg-green-50 text-green-700 shadow-[0_4px_0_0_#4ade80]' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                    >
                      <span className="text-2xl">{interest.emoji}</span>
                      {interest.label}
                    </motion.button>
                  );
                })}
              </div>
              <Button onClick={handleComplete} disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-green-500 py-6 text-2xl font-bold text-white shadow-[0_8px_0_0_#16a34a] hover:-translate-y-1 disabled:opacity-50">
                {loading ? 'Lade...' : 'Los geht\'s!'} <Star className="ml-2 h-8 w-8" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
```

### AUFGABE: TaskView.tsx – Fach-System + Antwortzeit-Messung + Erklärungen

Ersetze die gesamte Datei `src/features/learning/TaskView.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, Trophy, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubjectSelector } from './SubjectSelector';
import { pb } from '@/lib/pb';
import { generateTask } from '@/lib/gemini';
import type { User, Task, Subject } from '@/lib/types';

const XP_PER_LEVEL = 100;
const XP_CORRECT = 10;

interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

export function TaskView({ user, onUpdate }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const loadTask = async () => {
    setIsLoading(true);
    setSelected(null);
    setResult(null);
    setLeveledUp(false);
    startTimeRef.current = Date.now();
    try {
      const newTask = await generateTask(user);
      setTask(newTask);
    } catch (e) {
      console.error('Task load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTask(); }, [user.currentSubject]);

  const handleSubjectChange = async (subject: Subject) => {
    if (subject === user.currentSubject) return;
    try {
      const updated = await pb.collection('users').update<User>(user.id, { currentSubject: subject });
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const checkAnswer = async (answer: string) => {
    if (!task || result) return;
    const timeMs = Date.now() - startTimeRef.current;
    setSelected(answer);
    const correct = answer === task.correctAnswer;

    if (correct) {
      setResult('success');
      try {
        const newXp = user.xp + XP_CORRECT;
        const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
        if (newLevel > user.level) setLeveledUp(true);

        // Fach-Fortschritt aktualisieren
        const subjectProgress = [...(user.subjectProgress ?? [])];
        const idx = subjectProgress.findIndex(p => p.subject === task.subject);
        if (idx >= 0) {
          subjectProgress[idx] = {
            ...subjectProgress[idx],
            xp: subjectProgress[idx].xp + XP_CORRECT,
            correctStreak: subjectProgress[idx].correctStreak + 1,
            totalAnswered: subjectProgress[idx].totalAnswered + 1,
            totalCorrect: subjectProgress[idx].totalCorrect + 1,
          };
        } else {
          subjectProgress.push({ subject: task.subject, xp: XP_CORRECT, correctStreak: 1, totalAnswered: 1, totalCorrect: 1 });
        }

        const updatedUser = await pb.collection('users').update<User>(user.id, {
          xp: newXp,
          level: newLevel,
          subjectProgress,
        });
        onUpdate(updatedUser);

        // Task-Ergebnis loggen (für zukünftige Analyse)
        await pb.collection('task_results').create({
          userId: user.id,
          subject: task.subject,
          correct: true,
          timeToAnswerMs: timeMs,
          answeredAt: new Date().toISOString(),
        }).catch(() => {}); // Fehler hier nicht kritisch

      } catch (e) {
        console.error(e);
      }
    } else {
      setResult('fail');
      // Streak zurücksetzen
      const subjectProgress = [...(user.subjectProgress ?? [])];
      const idx = subjectProgress.findIndex(p => p.subject === task.subject);
      if (idx >= 0) {
        subjectProgress[idx] = {
          ...subjectProgress[idx],
          correctStreak: 0,
          totalAnswered: subjectProgress[idx].totalAnswered + 1,
        };
        await pb.collection('users').update(user.id, { subjectProgress }).catch(() => {});
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl xl:p-12 mb-12 flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="flex gap-3">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="h-5 w-5 rounded-full bg-indigo-400"
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <p className="text-xl font-bold text-indigo-300">KI denkt nach…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mb-12">
      <SubjectSelector current={user.currentSubject ?? 'deutsch'} onChange={handleSubjectChange} />

      <div className="rounded-3xl bg-white p-8 shadow-xl xl:p-12">
        {!task ? (
          <div className="flex flex-col items-center gap-4 min-h-[300px] justify-center">
            <p className="text-xl font-bold text-red-400">Aufgabe konnte nicht geladen werden.</p>
            <Button onClick={loadTask} className="bg-indigo-500 text-white rounded-xl">Nochmal versuchen</Button>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl bg-indigo-50 p-6 text-center border-4 border-indigo-100">
              <h3 className="mb-2 text-xl font-bold text-indigo-400">
                {task.subject === 'deutsch' ? '📖 Deutsch' :
                 task.subject === 'mathe' ? '🔢 Mathematik' :
                 task.subject === 'sachkunde' ? '🌍 Sachkunde' : '🇬🇧 Englisch'}
                {' · '}
                <span className="text-indigo-300 capitalize">{task.difficulty}</span>
              </h3>
              <p className="text-3xl font-extrabold text-indigo-900 leading-snug">{task.question}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mx-auto mb-8">
              {task.options.map(opt => {
                const isSelected = selected === opt;
                let btnClass = 'border-4 border-indigo-100 bg-white text-indigo-900 shadow-[0_6px_0_0_#e0e7ff] hover:border-indigo-300';
                if (isSelected) {
                  btnClass = result === 'success'
                    ? 'border-green-400 bg-green-50 text-green-600 shadow-[0_6px_0_0_#4ade80]'
                    : 'border-red-400 bg-red-50 text-red-600 shadow-[0_6px_0_0_#f87171]';
                } else if (result && opt === task.correctAnswer) {
                  // Richtige Antwort nach Fehler anzeigen
                  btnClass = 'border-green-200 bg-green-50 text-green-500 border-4';
                }
                return (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => checkAnswer(opt)} disabled={!!result} key={opt}
                    className={`flex h-24 items-center justify-center rounded-2xl font-bold text-2xl transition-all disabled:pointer-events-none ${btnClass}`}
                  >{opt}</motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`mt-4 flex flex-col items-center justify-center rounded-2xl p-8 border-4 border-dashed
                    ${result === 'success' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'}`}
                >
                  {result === 'success' ? (
                    <>
                      <motion.div initial={{ rotate: -45 }} animate={{ rotate: 0 }} transition={{ type: 'spring', damping: 10 }}>
                        <Check className="mb-4 h-16 w-16 rounded-full bg-green-400 p-3 text-white shadow-lg" />
                      </motion.div>
                      <h2 className="text-4xl font-black mb-2 flex items-center gap-2">
                        <Sparkles className="fill-green-400 text-green-400 h-8 w-8" /> Richtig!
                      </h2>
                      <p className="text-xl font-bold text-green-600 mb-2">+{XP_CORRECT} XP verdient!</p>

                      {/* Erklärung */}
                      {task.explanation && (
                        <div className="mt-2 mb-4 flex items-start gap-2 rounded-xl bg-green-200 px-4 py-3 text-left max-w-sm">
                          <Lightbulb className="h-5 w-5 mt-0.5 shrink-0 text-green-700" />
                          <p className="text-sm font-semibold text-green-800">{task.explanation}</p>
                        </div>
                      )}

                      {/* Fun Fact */}
                      {task.funFact && (
                        <p className="text-sm italic text-green-600 mb-4">{task.funFact}</p>
                      )}

                      <AnimatePresence>
                        {leveledUp && (
                          <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.7 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ type: 'spring', damping: 8, delay: 0.2 }}
                            className="mt-2 flex flex-col items-center gap-2"
                          >
                            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                              className="flex items-center gap-3 rounded-2xl bg-amber-400 px-8 py-4 shadow-[0_8px_0_0_#d97706]">
                              <Trophy className="h-10 w-10 fill-white text-white drop-shadow" />
                              <span className="text-3xl font-black tracking-wide text-white drop-shadow">LEVEL UP! 🎉</span>
                              <Trophy className="h-10 w-10 fill-white text-white drop-shadow" />
                            </motion.div>
                            <p className="text-lg font-bold text-amber-600">Du bist jetzt Level {user.level + 1}!</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button onClick={loadTask}
                        className="mt-6 font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-[0_4px_0_0_#16a34a] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#16a34a] min-w-[200px]">
                        Nächste Aufgabe →
                      </Button>
                    </>
                  ) : (
                    <>
                      <motion.div initial={{ rotate: 180 }} animate={{ rotate: 0 }} transition={{ type: 'spring', damping: 10 }}>
                        <X className="mb-4 h-16 w-16 rounded-full bg-red-400 p-3 text-white shadow-lg" />
                      </motion.div>
                      <h2 className="text-4xl font-black mb-2">Fast!</h2>
                      <p className="text-xl font-bold text-red-600 mb-2">Die richtige Antwort ist: <strong>{task.correctAnswer}</strong></p>

                      {/* Erklärung auch bei Fehler */}
                      {task.explanation && (
                        <div className="mt-2 mb-4 flex items-start gap-2 rounded-xl bg-red-200 px-4 py-3 text-left max-w-sm">
                          <Lightbulb className="h-5 w-5 mt-0.5 shrink-0 text-red-700" />
                          <p className="text-sm font-semibold text-red-800">{task.explanation}</p>
                        </div>
                      )}

                      <Button onClick={loadTask}
                        className="mt-4 font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-[0_4px_0_0_#dc2626] hover:-translate-y-1 min-w-[200px]">
                        Nächste Aufgabe →
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Sprint 3 – PocketBase Schema

### AUFGABE: PocketBase Collections einrichten

In PocketBase Admin (http://127.0.0.1:8090/_/) folgende Collections anlegen:

**Collection: `users`**
```
name          Text       required
klasse        Number     required, min: 1, max: 10
xp            Number     default: 0
level         Number     default: 1
currentSubject Text      default: "deutsch"
subjectProgress JSON     default: []
interests     JSON       default: []
lastActiveDate Text
loginStreak   Number     default: 0
```

**Collection: `task_results`** *(neu – für Analyse)*
```
userId        Relation → users   required
subject       Text               required
correct       Bool               required
timeToAnswerMs Number            required
answeredAt    Text               required
```

---

## Sprint 4 – Eltern-Dashboard (Vorbereitung)

### AUFGABE: Neue Route für Eltern-Ansicht vorbereiten

Neue Datei: `src/features/parent/ParentDashboard.tsx`
```tsx
import type { User } from '@/lib/types';

// TODO Sprint 4: Vollständiges Eltern-Dashboard
// Zeigt: Fortschritt je Fach, Lernzeit, Fehlermuster, Wochenübersicht

interface Props {
  user: User;
  onBack: () => void;
}

export function ParentDashboard({ user, onBack }: Props) {
  const subjectProgress = user.subjectProgress ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="rounded-xl bg-white px-4 py-2 font-bold text-slate-500 shadow hover:bg-slate-50">
            ← Zurück
          </button>
          <h1 className="text-2xl font-black text-slate-800">
            Fortschritt von {user.name}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm font-bold text-slate-400">Gesamt-XP</p>
            <p className="text-4xl font-black text-indigo-600">{user.xp}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm font-bold text-slate-400">Level</p>
            <p className="text-4xl font-black text-amber-500">{user.level}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow mb-4">
          <h2 className="mb-4 text-lg font-black text-slate-700">Fortschritt je Fach</h2>
          {subjectProgress.length === 0 ? (
            <p className="text-slate-400">Noch keine Aufgaben gelöst.</p>
          ) : subjectProgress.map(p => {
            const accuracy = p.totalAnswered > 0 ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0;
            return (
              <div key={p.subject} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-slate-700 capitalize">{p.subject}</span>
                  <span className="text-sm text-slate-400">{p.totalCorrect}/{p.totalAnswered} richtig ({accuracy}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-indigo-400 transition-all" style={{ width: `${accuracy}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-400">
          Sprint 4: Detaillierte Wochenübersicht, Fehlermuster & Empfehlungen folgen hier.
        </p>
      </div>
    </div>
  );
}
```

### AUFGABE: App.tsx – Eltern-Dashboard einbinden

Ersetze `src/App.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { HeaderDash } from '@/features/gamification/HeaderDash';
import { TaskView } from '@/features/learning/TaskView';
import { ParentDashboard } from '@/features/parent/ParentDashboard';
import type { User } from '@/lib/types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showParentView, setShowParentView] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    setShowParentView(false);
  };

  if (!user) return <OnboardingScreen onComplete={handleLogin} />;

  if (showParentView) {
    return <ParentDashboard user={user} onBack={() => setShowParentView(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        <HeaderDash
          user={user}
          onLogout={handleLogout}
          onParentView={() => setShowParentView(true)}
        />
        <main className="flex flex-col w-full items-center justify-center pt-8">
          <TaskView user={user} onUpdate={handleUserUpdate} />
        </main>
      </div>
    </div>
  );
}
```

### AUFGABE: HeaderDash.tsx – Eltern-Button hinzufügen

Füge in `src/features/gamification/HeaderDash.tsx` den `onParentView` Prop hinzu:
```tsx
// Interface erweitern:
interface Props {
  user: User;
  onLogout: () => void;
  onParentView: () => void;  // NEU
}

// Im JSX nach dem Level-Badge, vor dem Logout-Button einfügen:
<button
  onClick={onParentView}
  className="rounded-full bg-indigo-50 p-3 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
  title="Eltern-Ansicht"
>
  📊
</button>
```

---

## Offene TODOs für spätere Sprints

```
TODO: PocketBase auf Server deployen (Railway / Fly.io)
TODO: Gemini API-Aufrufe über Backend-Proxy leiten (API-Key absichern)
TODO: Bewegungspausen-Timer implementieren (nach X Minuten Pause vorschlagen)
TODO: Foto-Upload für Offline-Aufgaben (Kamera-Integration)
TODO: Wochenplan-Feature (Eltern planen Lernziele)
TODO: Login-Streak-Anzeige im Header
TODO: Fach-spezifische XP-Balken im Header
TODO: Mehrsprachigkeit (i18n) vorbereiten
TODO: PWA-Manifest für Mobile-Installation
TODO: ADHS-Modus: kürzere Sessions, mehr Pausen, einfachere UI
```

---

## Befehle

```bash
# Entwicklung starten
npm run dev

# Bauen
npm run build

# Linting
npm run lint

# PocketBase starten (lokal)
./pocketbase serve
```

## Umgebungsvariablen (.env.local)

```
VITE_GEMINI_API_KEY=dein_gemini_key_hier
```
