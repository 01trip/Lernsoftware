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

const DEUTSCH_THEMEN = ['Tiere', 'Natur', 'Schule', 'Familie', 'Essen', 'Sport', 'Jahreszeiten', 'Farben', 'Berufe', 'Verkehr'];
const MATHE_THEMEN = ['Addition', 'Subtraktion', 'Multiplikation', 'Division', 'Geometrie', 'Messen', 'Uhrzeiten', 'Geld', 'Brüche'];
const SACHKUNDE_THEMEN = ['Tiere', 'Pflanzen', 'Wetter', 'Körper', 'Berufe', 'Verkehr', 'Jahreszeiten', 'Umwelt', 'Geschichte', 'Geografie'];
const ENGLISCH_THEMEN = ['Farben', 'Zahlen', 'Tiere', 'Familie', 'Schule', 'Essen', 'Wochentage', 'Körper', 'Sport', 'Hobbys'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt(user: User, difficulty: DifficultyLevel): string {
  const klasse = Math.max(1, Math.min(10, user.klasse));
  const alter = klasse + 5;
  const subject = user.currentSubject;
  const diffLabel = { leicht: 'einfach', mittel: 'mittelschwer', schwer: 'herausfordernd' }[difficulty];

  const themenMap = { deutsch: DEUTSCH_THEMEN, mathe: MATHE_THEMEN, sachkunde: SACHKUNDE_THEMEN, englisch: ENGLISCH_THEMEN };
  const zufallsThema = randomFrom(themenMap[subject]);
  const zufallsId = Math.random().toString(36).substring(2, 7);

  const baseInstructions = `
[Aufgaben-ID: ${zufallsId}] Du erstellst eine ${diffLabel}e ${SUBJECT_LABELS[subject]}-Aufgabe zum Thema "${zufallsThema}" für ein Kind in Klasse ${klasse} (ca. ${alter} Jahre alt).

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

// ─── Lokaler Aufgaben-Pool (Fallback wenn API nicht verfügbar) ────────────

const TASK_POOL: Record<Subject, Task[]> = {
  deutsch: [
    { question: "Was ist das Gegenteil von 'groß'?", options: ['klein', 'schnell', 'blau', 'laut'], correctAnswer: 'klein', subject: 'deutsch', difficulty: 'leicht', explanation: "Gegensätze nennt man auch Antonyme. 'Klein' ist das Gegenteil von 'groß'.", funFact: "Die deutsche Sprache hat über 400.000 Wörter im Wörterbuch! 📚" },
    { question: "Welches Wort reimt sich auf 'Haus'?", options: ['Maus', 'Hund', 'Baum', 'Blume'], correctAnswer: 'Maus', subject: 'deutsch', difficulty: 'leicht', explanation: "Reimwörter enden mit demselben Klang. 'Haus' und 'Maus' reimen sich auf '-aus'.", funFact: "Das älteste deutsche Gedicht mit Reimen ist über 1000 Jahre alt! 📜" },
    { question: "Was ist ein Nomen (Hauptwort)?", options: ['Hund', 'laufen', 'schnell', 'und'], correctAnswer: 'Hund', subject: 'deutsch', difficulty: 'leicht', explanation: "Nomen sind Namenwörter – sie bezeichnen Dinge, Tiere oder Personen. 'Hund' ist ein Tier.", funFact: "Nomen schreibt man im Deutschen immer groß – das ist weltweit einzigartig! 🇩🇪" },
    { question: "Welcher Buchstabe fehlt? 'Der H_nd bellt laut.'", options: ['u', 'a', 'i', 'o'], correctAnswer: 'u', subject: 'deutsch', difficulty: 'leicht', explanation: "Das Wort lautet 'Hund' – ein Tier das bellt.", funFact: "Hunde können über 1000 verschiedene Wörter verstehen! 🐕" },
    { question: "Was ist das Gegenteil von 'kalt'?", options: ['warm', 'nass', 'laut', 'dunkel'], correctAnswer: 'warm', subject: 'deutsch', difficulty: 'leicht', explanation: "'Warm' ist das Gegenteil von 'kalt' – beide beschreiben Temperaturen.", funFact: "Die heißeste gemessene Temperatur auf der Erde war 56,7°C in der Wüste! 🌡️" },
    { question: "Welches Wort ist ein Verb (Tunwort)?", options: ['springen', 'Baum', 'blau', 'Tisch'], correctAnswer: 'springen', subject: 'deutsch', difficulty: 'leicht', explanation: "Verben beschreiben Tätigkeiten oder Handlungen. 'Springen' ist eine Tätigkeit.", funFact: "Im Deutschen gibt es über 6000 verschiedene Verben! 💪" },
    { question: "Wie schreibt man das richtig?", options: ['der Hund', 'Der hund', 'der hund', 'Der Hund'], correctAnswer: 'der Hund', subject: 'deutsch', difficulty: 'mittel', explanation: "Das Nomen 'Hund' schreibt man groß, aber der Artikel 'der' am Satzanfang nicht – hier steht es in der Mitte.", funFact: "Im Englischen werden alle Nomen klein geschrieben – nur im Deutschen groß!" },
    { question: "Welches ist ein Adjektiv (Eigenschaftswort)?", options: ['fleißig', 'Schule', 'rennen', 'weil'], correctAnswer: 'fleißig', subject: 'deutsch', difficulty: 'mittel', explanation: "Adjektive beschreiben Eigenschaften. 'Fleißig' beschreibt wie jemand ist.", funFact: "Das längste deutsche Adjektiv soll 'antikonstitutionellste' sein – mit 25 Buchstaben! 🤯" },
    { question: "Was ist der Plural von 'das Kind'?", options: ['die Kinder', 'die Kinds', 'die Kindes', 'die Kinde'], correctAnswer: 'die Kinder', subject: 'deutsch', difficulty: 'mittel', explanation: "Die Mehrzahl von 'Kind' heißt 'Kinder'. Im Deutschen gibt es viele verschiedene Pluralformen.", funFact: "Manche Wörter wie 'Schere' haben nur einen Plural – du kannst nicht 'eine Schere' sagen! ✂️" },
    { question: "Welches Satzzeichen kommt am Ende einer Frage?", options: ['?', '.', '!', ','], correctAnswer: '?', subject: 'deutsch', difficulty: 'leicht', explanation: "Am Ende einer Frage steht immer ein Fragezeichen (?). Damit zeigen wir, dass wir etwas wissen wollen.", funFact: "Das Fragezeichen stammt vom lateinischen Wort 'quaestio' (Frage) ab! ❓" },
  ],
  mathe: [
    { question: "Was ist 7 × 8?", options: ['54', '56', '48', '63'], correctAnswer: '56', subject: 'mathe', difficulty: 'mittel', explanation: "7 × 8 = 56. Merkhilfe: 5, 6, 7, 8 – 56 = 7 × 8!", funFact: "Das Einmaleins wurde schon vor 4000 Jahren in Babylon benutzt! 🔢" },
    { question: "Was ist 15 + 28?", options: ['43', '42', '44', '41'], correctAnswer: '43', subject: 'mathe', difficulty: 'mittel', explanation: "15 + 28: Erst 15 + 20 = 35, dann 35 + 8 = 43.", funFact: "Addition ist eine der ältesten mathematischen Operationen der Menschheit! ➕" },
    { question: "Was ist 9 × 6?", options: ['54', '56', '52', '58'], correctAnswer: '54', subject: 'mathe', difficulty: 'mittel', explanation: "9 × 6 = 54. Trick: 9 × 6 = 10 × 6 - 6 = 60 - 6 = 54.", funFact: "Mit dem 9er-Trick kannst du alle 9er-Reihen mit den Fingern ausrechnen! 🖐️" },
    { question: "Welche Zahl kommt nach 99?", options: ['100', '109', '90', '101'], correctAnswer: '100', subject: 'mathe', difficulty: 'leicht', explanation: "Nach 99 kommt 100. Wir wechseln von den zweistelligen zu den dreistelligen Zahlen.", funFact: "100 heißt auch 'ein Jahrhundert' – das sind 100 Jahre! 🎂" },
    { question: "Was ist 64 ÷ 8?", options: ['8', '7', '9', '6'], correctAnswer: '8', subject: 'mathe', difficulty: 'mittel', explanation: "64 ÷ 8 = 8, weil 8 × 8 = 64. Division ist das Umkehren der Multiplikation.", funFact: "Das Divisionszeichen ÷ heißt 'Obelus' und wurde erst im 17. Jahrhundert erfunden! ➗" },
    { question: "Wie viele Ecken hat ein Dreieck?", options: ['3', '4', '2', '5'], correctAnswer: '3', subject: 'mathe', difficulty: 'leicht', explanation: "Ein Dreieck hat genau 3 Ecken und 3 Seiten – daher der Name 'Drei-Eck'.", funFact: "Die ägyptischen Pyramiden sind Dreiecke – über 4500 Jahre alt! 🔺" },
    { question: "Was ist die Hälfte von 80?", options: ['40', '50', '30', '45'], correctAnswer: '40', subject: 'mathe', difficulty: 'leicht', explanation: "Die Hälfte bedeutet durch 2 teilen: 80 ÷ 2 = 40.", funFact: "Die Hälfte nennt man in der Mathematik auch '1/2' oder '0,5'! 🍕" },
    { question: "Wie viele Minuten hat eine Stunde?", options: ['60', '100', '30', '50'], correctAnswer: '60', subject: 'mathe', difficulty: 'leicht', explanation: "Eine Stunde hat 60 Minuten. Das 60er-System für Zeit kommt von den alten Babyloniern.", funFact: "Früher wurde die Zeit mit Sonnenuhren gemessen – kein Ticket, keine Pause! ⏰" },
    { question: "Was ist 3² (3 hoch 2)?", options: ['9', '6', '8', '12'], correctAnswer: '9', subject: 'mathe', difficulty: 'schwer', explanation: "3² bedeutet 3 × 3 = 9. 'Hoch 2' heißt, man multipliziert die Zahl mit sich selbst.", funFact: "Quadratzahlen heißen so, weil man damit die Fläche von Quadraten berechnet! ⬛" },
    { question: "Ein Rechteck ist 5 cm lang und 3 cm breit. Wie groß ist der Umfang?", options: ['16 cm', '15 cm', '8 cm', '30 cm'], correctAnswer: '16 cm', subject: 'mathe', difficulty: 'schwer', explanation: "Umfang = 2 × (Länge + Breite) = 2 × (5+3) = 2 × 8 = 16 cm.", funFact: "Der Umfang der Erde beträgt fast 40.000 km – eine Weltumrundung! 🌍" },
  ],
  sachkunde: [
    { question: "Welches Tier schläft den ganzen Winter?", options: ['Bär', 'Hase', 'Schmetterling', 'Storch'], correctAnswer: 'Bär', subject: 'sachkunde', difficulty: 'leicht', explanation: "Bären halten Winterschlaf – sie schlafen von Oktober bis März in ihrer Höhle.", funFact: "Während des Winterschlafs frisst der Bär gar nichts und lebt von seinem Fettvorrat! 🐻" },
    { question: "Was brauchen Pflanzen zum Wachsen?", options: ['Licht, Wasser und Erde', 'Nur Wasser', 'Nur Licht', 'Zucker und Salz'], correctAnswer: 'Licht, Wasser und Erde', subject: 'sachkunde', difficulty: 'leicht', explanation: "Pflanzen brauchen Sonnenlicht für die Fotosynthese, Wasser zum Leben und Nährstoffe aus der Erde.", funFact: "Eine Buche kann über 400 Jahre alt werden! 🌳" },
    { question: "Wie viele Planeten hat unser Sonnensystem?", options: ['8', '9', '7', '10'], correctAnswer: '8', subject: 'sachkunde', difficulty: 'mittel', explanation: "Unser Sonnensystem hat 8 Planeten: Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus, Neptun.", funFact: "Pluto war früher auch ein Planet, wurde aber 2006 zum 'Zwergplaneten' erklärt! 🪐" },
    { question: "Was ist die Hauptstadt von Österreich?", options: ['Wien', 'Salzburg', 'Graz', 'Innsbruck'], correctAnswer: 'Wien', subject: 'sachkunde', difficulty: 'leicht', explanation: "Wien ist die Hauptstadt und größte Stadt von Österreich.", funFact: "Wien hat mehr Einwohner als alle anderen österreichischen Bundesländer zusammen! 🇦🇹" },
    { question: "Aus welchem Material wird Papier gemacht?", options: ['Holz', 'Stein', 'Sand', 'Plastik'], correctAnswer: 'Holz', subject: 'sachkunde', difficulty: 'leicht', explanation: "Papier wird hauptsächlich aus Holzfasern (Zellulose) hergestellt.", funFact: "Für ein Buch werden ca. 2–3 Bäume gefällt – deshalb ist Recycling so wichtig! 📄" },
    { question: "Was macht ein Arzt?", options: ['Er hilft kranken Menschen', 'Er baut Häuser', 'Er unterrichtet Kinder', 'Er kocht Essen'], correctAnswer: 'Er hilft kranken Menschen', subject: 'sachkunde', difficulty: 'leicht', explanation: "Ärzte untersuchen kranke Menschen, stellen Diagnosen und helfen ihnen gesund zu werden.", funFact: "Der älteste bekannte Arzt der Geschichte lebte vor über 4000 Jahren in Ägypten! 👨‍⚕️" },
    { question: "Welches ist das größte Tier der Welt?", options: ['Blauwal', 'Elefant', 'Giraffe', 'Hai'], correctAnswer: 'Blauwal', subject: 'sachkunde', difficulty: 'mittel', explanation: "Der Blauwal ist das größte Tier, das je auf der Erde gelebt hat – bis zu 30 Meter lang!", funFact: "Das Herz eines Blauwals ist so groß wie ein kleines Auto! 🐋" },
    { question: "Was ist Fotosynthese?", options: ['Pflanzen wandeln Sonnenlicht in Energie um', 'Tiere fressen Pflanzen', 'Wasser verdunstet in der Luft', 'Steine werden zu Sand'], correctAnswer: 'Pflanzen wandeln Sonnenlicht in Energie um', subject: 'sachkunde', difficulty: 'mittel', explanation: "Bei der Fotosynthese nehmen Pflanzen Sonnenlicht, Wasser und CO₂ auf und produzieren Zucker und Sauerstoff.", funFact: "Ohne Fotosynthese gäbe es keinen Sauerstoff – wir könnten nicht atmen! 🌿" },
    { question: "Welcher Fluss fließt durch Wien?", options: ['Donau', 'Rhein', 'Elbe', 'Inn'], correctAnswer: 'Donau', subject: 'sachkunde', difficulty: 'leicht', explanation: "Die Donau ist der zweitlängste Fluss Europas und fließt durch Wien.", funFact: "Die Donau fließt durch 10 Länder – mehr als jeder andere Fluss der Welt! 🌊" },
    { question: "Was ist ein Vulkan?", options: ['Ein Berg, aus dem Lava austritt', 'Ein tiefer See', 'Eine Art Wüste', 'Ein Gebirge aus Eis'], correctAnswer: 'Ein Berg, aus dem Lava austritt', subject: 'sachkunde', difficulty: 'leicht', explanation: "Vulkane sind Öffnungen in der Erdkruste, aus denen heißes geschmolzenes Gestein (Lava) austritt.", funFact: "Es gibt auf der Erde über 1500 aktive Vulkane! 🌋" },
  ],
  englisch: [
    { question: "Was bedeutet das englische Wort 'butterfly'?", options: ['Schmetterling', 'Blume', 'Vogel', 'Käfer'], correctAnswer: 'Schmetterling', subject: 'englisch', difficulty: 'leicht', explanation: "'Butterfly' ist das englische Wort für Schmetterling.", funFact: "In England sagt man 'butterfly', in Amerika auch – Schmetterlinge sind überall beliebt! 🦋" },
    { question: "Wie heißt 'Hund' auf Englisch?", options: ['dog', 'cat', 'bird', 'fish'], correctAnswer: 'dog', subject: 'englisch', difficulty: 'leicht', explanation: "'Dog' ist das englische Wort für Hund.", funFact: "Englisch ist die meistgesprochene Sprache der Welt – über 1,5 Milliarden Menschen sprechen sie! 🌍" },
    { question: "Was bedeutet 'red'?", options: ['rot', 'blau', 'grün', 'gelb'], correctAnswer: 'rot', subject: 'englisch', difficulty: 'leicht', explanation: "'Red' ist die englische Farbe für Rot.", funFact: "Rot ist die Farbe, die von Menschen am häufigsten als 'Lieblingsfarbe' gewählt wird! ❤️" },
    { question: "Wie sagt man 'Guten Morgen' auf Englisch?", options: ['Good morning', 'Good night', 'Good evening', 'Good day'], correctAnswer: 'Good morning', subject: 'englisch', difficulty: 'leicht', explanation: "'Good morning' bedeutet 'Guten Morgen' – man sagt es wenn man jemanden am Vormittag begrüßt.", funFact: "In Australien, wo es wärmer ist, wünscht man sich trotzdem 'Good morning'! 🦘" },
    { question: "Was bedeutet 'school'?", options: ['Schule', 'Stuhl', 'Schloss', 'Schokolade'], correctAnswer: 'Schule', subject: 'englisch', difficulty: 'leicht', explanation: "'School' ist das englische Wort für Schule. Achtung: Es klingt anders als es aussieht!", funFact: "Das englische Wort 'school' kommt aus dem Griechischen 'skholē'! 📚" },
    { question: "Wie heißen die Zahlen 1-3 auf Englisch?", options: ['one, two, three', 'un, deux, trois', 'ein, zwei, drei', 'uno, dos, tres'], correctAnswer: 'one, two, three', subject: 'englisch', difficulty: 'leicht', explanation: "Die ersten drei Zahlen auf Englisch sind: one (1), two (2), three (3).", funFact: "Im Englischen gibt es keine grammatikalischen Geschlechter (der/die/das) – alles ist 'the'! 🔢" },
    { question: "Was bedeutet 'apple'?", options: ['Apfel', 'Orange', 'Birne', 'Banane'], correctAnswer: 'Apfel', subject: 'englisch', difficulty: 'leicht', explanation: "'Apple' ist das englische Wort für Apfel. Eine bekannte Firma heißt auch so!", funFact: "Es gibt über 7500 verschiedene Apfelsorten weltweit! 🍎" },
    { question: "Wie sagt man 'Ich bin müde' auf Englisch?", options: ['I am tired', 'I am hungry', 'I am happy', 'I am cold'], correctAnswer: 'I am tired', subject: 'englisch', difficulty: 'mittel', explanation: "'I am tired' bedeutet 'Ich bin müde'. 'I am' = Ich bin, 'tired' = müde.", funFact: "Das englische Wort 'tired' (müde) kommt vom altnordischen 'þreyta'! 😴" },
    { question: "Was bedeutet 'Where are you from?'", options: ['Woher kommst du?', 'Wie heißt du?', 'Wie alt bist du?', 'Was machst du?'], correctAnswer: 'Woher kommst du?', subject: 'englisch', difficulty: 'mittel', explanation: "'Where are you from?' fragt nach der Herkunft – woher jemand kommt.", funFact: "Englisch hat Wörter aus über 350 verschiedenen Sprachen geborgt! 🗺️" },
    { question: "Vervollständige: 'She ___ a cat.' (hat)", options: ['has', 'have', 'is', 'are'], correctAnswer: 'has', subject: 'englisch', difficulty: 'mittel', explanation: "Bei 'he/she/it' benutzt man 'has' statt 'have' – das ist eine Besonderheit des Englischen.", funFact: "Die englische Grammatik hat keine Fälle (Nominativ, Akkusativ...) wie im Deutschen! 🐱" },
  ],
};

function getRandomFallback(subject: Subject): Task {
  const pool = TASK_POOL[subject];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Haupt-Export ─────────────────────────────────────────────────────────

export async function generateTask(user: User): Promise<Task> {
  const difficulty = getDifficulty(user);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 1.0,
      },
    });

    const prompt = buildPrompt(user, difficulty);
    console.log('[Gemini] Sende Prompt:', prompt.substring(0, 120));
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.log('[Gemini] Antwort:', text.substring(0, 200));

    // Backticks entfernen falls Gemini sie trotzdem schickt
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(clean) as Task;

  } catch (error) {
    console.error('Fehler bei der KI-Aufgabengenerierung:', error);
    return getRandomFallback(user.currentSubject);
  }
}
