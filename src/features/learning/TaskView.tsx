import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pb } from '@/lib/pb';

interface Props {
  user: any;
  onUpdate: (user: any) => void;
}

export function TaskView({ user, onUpdate }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);

  // Hardcoded task for first prototype
  const task = {
    question: "Welches Wort passt in die Lücke?",
    text: "Der Bär isst gerne süßen ______.",
    options: ["Honig", "Stein", "Baum", "Auto"],
    correct: "Honig"
  };

  const checkAnswer = async (answer: string) => {
    setSelected(answer);
    if (answer === task.correct) {
      setResult('success');
      // Add XP
      if (user) {
        try {
          const updatedUser = await pb.collection('users').update(user.id, {
            xp: user.xp + 10
          });
          onUpdate(updatedUser);
        } catch(e) {
          console.error(e);
        }
      }
    } else {
      setResult('fail');
    }
  };

  const retry = () => {
    setSelected(null);
    setResult(null);
  };

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl xl:p-12 mb-12">
      <div className="mb-8 rounded-2xl bg-indigo-50 p-6 text-center border-4 border-indigo-100">
        <h3 className="mb-2 text-xl font-bold text-indigo-400">
          Lesen {`&`} Verstehen
        </h3>
        <p className="text-3xl font-extrabold text-indigo-900 leading-snug">
          {task.question}
        </p>
      </div>

      <div className="mb-12 text-center text-4xl font-bold tracking-tight text-gray-700 p-8 bg-gray-50 rounded-2xl">
        {task.text.split("______").map((part, i, arr) => (
          <Fragment key={i}>
            {part}
            {i !== arr.length - 1 && (
              <span className={`inline-block border-b-4 border-dashed mx-2 
                ${selected ? (result === 'success' ? 'border-green-400 text-green-500' : 'border-red-400 text-red-500') : 'border-indigo-300 text-indigo-500'}
              `}>
                {selected ? selected : "        "}
              </span>
            )}
          </Fragment>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
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
              className={`flex h-24 items-center justify-center rounded-2xl font-bold text-2xl transition-all disabled:pointer-events-none 
                ${btnClass}`}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`mt-12 flex flex-col items-center justify-center rounded-2xl p-8 border-4 border-dashed
              ${result === 'success' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'}`}
          >
            {result === 'success' ? (
              <>
                <motion.div 
                  initial={{ rotate: -45 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", damping: 10, stiffness: 200 }}
                >
                  <Check className="mb-4 h-16 w-16 rounded-full bg-green-400 p-3 text-white shadow-lg" />
                </motion.div>
                <h2 className="text-4xl font-black mb-2 flex items-center gap-2">
                  <Sparkles className="fill-green-400 text-green-400 h-8 w-8" /> Richtig!
                </h2>
                <p className="text-xl font-bold text-green-600">+10 XP verdient!</p>
                <Button 
                   onClick={retry}
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
                  transition={{ type: "spring", damping: 10, stiffness: 200 }}
                >
                  <X className="mb-4 h-16 w-16 rounded-full bg-red-400 p-3 text-white shadow-lg" />
                </motion.div>
                <h2 className="text-4xl font-black mb-2">Schade!</h2>
                <p className="text-xl font-bold text-red-600">Versuch es gleich noch einmal.</p>
                <Button 
                   onClick={retry}
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
