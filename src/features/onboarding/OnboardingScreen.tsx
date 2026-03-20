import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pb } from '@/lib/pb';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

interface Props {
  onComplete: (user: User) => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [klasse, setKlasse] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `name = "${name}" && klasse = ${klasse}`
      });

      if (existingUsers.items.length > 0) {
        onComplete(existingUsers.items[0]);
      } else {
        const newUser = await pb.collection('users').create({
          name,
          klasse,
          xp: 0,
          level: 1
        });
        onComplete(newUser);
      }
    } catch(err) {
      console.error(err);
      alert('Error creating user profile.');
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
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
            >
              <h1 className="mb-4 text-center font-bold text-4xl text-purple-600 sm:text-5xl">
                Hallo! 👋
              </h1>
              <p className="mb-8 text-center text-xl text-gray-500">
                Wie heißt du?
              </p>
              
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Vorname"
                className="mb-8 w-full rounded-2xl border-4 border-indigo-100 bg-indigo-50 px-6 py-4 text-center text-2xl font-bold text-indigo-900 outline-none transition-all placeholder:text-indigo-300 focus:border-indigo-400 focus:bg-white"
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                autoFocus
              />
              
              <Button 
                onClick={handleNext} 
                className="flex w-full items-center justify-center rounded-2xl bg-indigo-500 py-6 text-2xl font-bold text-white shadow-[0_8px_0_0_#4338ca] hover:-translate-y-1 hover:bg-indigo-400 hover:shadow-[0_12px_0_0_#4738ca] active:translate-y-2 active:shadow-none"
                disabled={!name.trim()}
              >
                Weiter <ArrowRight className="ml-2 h-8 w-8" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h1 className="mb-4 text-center font-bold text-4xl text-pink-500 sm:text-5xl">
                Toll, {name}! 🌟
              </h1>
              <p className="mb-8 text-center text-xl text-gray-500">
                In welche Klasse gehst du?
              </p>

              <div className="mb-8 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((k) => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={k}
                    onClick={() => setKlasse(k)}
                    className={`flex h-24 flex-col items-center justify-center rounded-2xl border-4 font-bold text-4xl transition-all ${
                      klasse === k 
                        ? 'border-pink-500 bg-pink-100 text-pink-600 shadow-[0_6px_0_0_#ec4899]' 
                        : 'border-pink-100 bg-white text-pink-300 hover:border-pink-300'
                    }`}
                  >
                    {k}.
                  </motion.button>
                ))}
              </div>

              <Button 
                onClick={handleNext} 
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-pink-500 py-6 text-2xl font-bold text-white shadow-[0_8px_0_0_#be185d] hover:-translate-y-1 hover:bg-pink-400 hover:shadow-[0_12px_0_0_#be185d] active:translate-y-2 active:shadow-none disabled:opacity-50"
              >
                {loading ? 'Lade...' : 'Los geht\'s!'} <Star className="ml-2 h-8 w-8" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
