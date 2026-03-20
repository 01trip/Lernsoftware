import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pb } from '@/lib/pb';
import { generateTask } from '@/lib/gemini';
import type { Task } from '@/lib/gemini';
import type { User } from '@/lib/types';

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

  const loadTask = async () => {
    setIsLoading(true);
    setSelected(null);
    setResult(null);
    setLeveledUp(false);
    try {
      const newTask = await generateTask(user);
      setTask(newTask);
    } catch (e) {
      console.error('Gemini error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, []);

  const checkAnswer = async (answer: string) => {
    if (!task) return;
    setSelected(answer);
    if (answer === task.correctAnswer) {
      setResult('success');
      try {
        const newXp = user.xp + 10;
        const nextLevelThreshold = user.level * 100;
        let newLevel = user.level;

        if (newXp >= nextLevelThreshold) {
          newLevel = user.level + 1;
          setLeveledUp(true);
        }

        const updatedUser = await pb.collection('users').update<User>(user.id, {
          xp: newXp,
          level: newLevel,
        });
        onUpdate(updatedUser);
      } catch (e) {
        console.error(e);
      }
    } else {
      setResult('fail');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl xl:p-12 mb-12 flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-5 w-5 rounded-full bg-indigo-400"
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <p className="text-xl font-bold text-indigo-300">KI denkt nach…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl xl:p-12 mb-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-xl font-bold text-red-400">Aufgabe konnte nicht geladen werden.</p>
        <Button onClick={loadTask} className="bg-indigo-500 text-white rounded-xl">
          Nochmal versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl xl:p-12 mb-12">
      <div className="mb-8 rounded-2xl bg-indigo-50 p-6 text-center border-4 border-indigo-100">
        <h3 className="mb-2 text-xl font-bold text-indigo-400">
          Lesen &amp; Verstehen
        </h3>
        <p className="text-3xl font-extrabold text-indigo-900 leading-snug">
          {task.question}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mx-auto mb-8">
        {task.options.map((opt) => {
          const isSelected = selected === opt;
          let btnClass = "border-4 border-indigo-100 bg-white text-indigo-900 shadow-[0_6px_0_0_#e0e7ff] hover:border-indigo-300";
          if (isSelected) {
            btnClass = result === 'success'
              ? "border-green-400 bg-green-50 text-green-600 shadow-[0_6px_0_0_#4ade80]"
              : "border-red-400 bg-red-50 text-red-600 shadow-[0_6px_0_0_#f87171]";
          }

          return (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => !result && checkAnswer(opt)}
              disabled={!!result}
              key={opt}
              className={`flex h-24 items-center justify-center rounded-2xl font-bold text-2xl transition-all disabled:pointer-events-none ${btnClass}`}
            >
              {opt}
            </motion.button>
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
                <motion.div
                  initial={{ rotate: -45 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                >
                  <Check className="mb-4 h-16 w-16 rounded-full bg-green-400 p-3 text-white shadow-lg" />
                </motion.div>
                <h2 className="text-4xl font-black mb-2 flex items-center gap-2">
                  <Sparkles className="fill-green-400 text-green-400 h-8 w-8" /> Richtig!
                </h2>
                <p className="text-xl font-bold text-green-600">+10 XP verdient!</p>

                <AnimatePresence>
                  {leveledUp && (
                    <motion.div
                      initial={{ opacity: 0, y: 40, scale: 0.7 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', damping: 8, stiffness: 180, delay: 0.2 }}
                      className="mt-4 flex flex-col items-center gap-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                        className="flex items-center gap-3 rounded-2xl bg-amber-400 px-8 py-4 shadow-[0_8px_0_0_#d97706]"
                      >
                        <Trophy className="h-10 w-10 fill-white text-white drop-shadow" />
                        <span className="text-3xl font-black tracking-wide text-white drop-shadow">
                          LEVEL UP! 🎉
                        </span>
                        <Trophy className="h-10 w-10 fill-white text-white drop-shadow" />
                      </motion.div>
                      <p className="text-lg font-bold text-amber-600">
                        Du bist jetzt Level {user.level}!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={loadTask}
                  className="mt-6 font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-[0_4px_0_0_#16a34a] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#16a34a] active:translate-y-1 active:shadow-none min-w-[200px]"
                >
                  Nächste Aufgabe
                </Button>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ rotate: 180 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                >
                  <X className="mb-4 h-16 w-16 rounded-full bg-red-400 p-3 text-white shadow-lg" />
                </motion.div>
                <h2 className="text-4xl font-black mb-2">Schade!</h2>
                <p className="text-xl font-bold text-red-600">Versuch es gleich noch einmal.</p>
                <Button
                  onClick={() => { setSelected(null); setResult(null); }}
                  className="mt-6 font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-[0_4px_0_0_#dc2626] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#dc2626] active:translate-y-1 active:shadow-none min-w-[200px]"
                >
                  Nochmal versuchen
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
