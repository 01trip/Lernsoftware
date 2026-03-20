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
  { id: 'tiere',   label: 'Tiere',   emoji: '🐾' },
  { id: 'sport',   label: 'Sport',   emoji: '⚽' },
  { id: 'bauen',   label: 'Bauen',   emoji: '🔨' },
  { id: 'natur',   label: 'Natur',   emoji: '🌿' },
  { id: 'kochen',  label: 'Kochen',  emoji: '🍕' },
  { id: 'musik',   label: 'Musik',   emoji: '🎵' },
  { id: 'technik', label: 'Technik', emoji: '🤖' },
  { id: 'kunst',   label: 'Kunst',   emoji: '🎨' },
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
      // Sicherer Filter – Sonderzeichen im Namen werden entfernt
      const safeName = name.replace(/['"\\]/g, '');
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `name = "${safeName}" && klasse = ${Number(klasse)}`,
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
              <p className="mb-6 text-center text-lg text-gray-500">Was magst du am liebsten?<br /><span className="text-sm">(Wähle so viele du möchtest)</span></p>
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
                {loading ? 'Lade...' : "Los geht's!"} <Star className="ml-2 h-8 w-8" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
