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
