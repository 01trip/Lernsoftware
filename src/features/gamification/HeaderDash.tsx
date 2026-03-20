import { motion } from 'framer-motion';
import { Trophy, Star, LogOut, Flame } from 'lucide-react';
import type { User, Subject } from '@/lib/types';

interface Props {
  user: User;
  onLogout: () => void;
  onParentView: () => void;
}

const XP_PER_LEVEL = 100;

const SUBJECT_COLORS: Record<Subject, string> = {
  deutsch:   'bg-blue-400',
  mathe:     'bg-green-400',
  sachkunde: 'bg-amber-400',
  englisch:  'bg-purple-400',
};

const SUBJECT_ICONS: Record<Subject, string> = {
  deutsch:   '📖',
  mathe:     '🔢',
  sachkunde: '🌍',
  englisch:  '🇬🇧',
};

export function HeaderDash({ user, onLogout, onParentView }: Props) {
  const currentXp = user?.xp || 0;
  const currentLevel = user?.level || 1;
  const xpInCurrentLevel = currentXp % XP_PER_LEVEL;
  const progress = Math.round((xpInCurrentLevel / XP_PER_LEVEL) * 100);
  const streak = user?.loginStreak || 0;
  const subjectProgress = user?.subjectProgress ?? [];

  return (
    <div className="w-full rounded-3xl bg-white p-4 shadow-sm md:p-6 mb-8">
      {/* Hauptzeile */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-500 shadow-inner">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>

          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800">
              Hallo, {user?.name}!
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-gray-400">Klasse {user?.klasse}</p>
              {streak > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-500">
                  <Flame className="h-3 w-3 fill-orange-400" />
                  {streak} {streak === 1 ? 'Tag' : 'Tage'} Streak
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* XP Bar */}
          <div className="hidden flex-col items-end sm:flex">
            <div className="mb-2 flex w-48 items-center justify-between font-bold">
              <span className="flex items-center text-amber-500">
                <Star className="mr-1 h-5 w-5 fill-amber-400" /> {currentXp} XP
              </span>
              <span className="text-gray-400 text-sm">/ {XP_PER_LEVEL} XP</span>
            </div>
            <div className="h-4 w-48 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, type: 'spring' }}
                className="h-full rounded-full bg-amber-400"
              />
            </div>
          </div>

          {/* Level Badge */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-orange-500 font-bold text-white shadow-[0_6px_0_0_#ea580c] cursor-pointer"
          >
            <Trophy className="h-6 w-6 fill-white" />
            <span className="text-sm leading-none">LVL {currentLevel}</span>
          </motion.div>

          {/* Eltern-Ansicht */}
          <button
            onClick={onParentView}
            className="rounded-full bg-indigo-50 p-3 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
            title="Eltern-Ansicht"
          >
            📊
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="rounded-full bg-gray-100 p-3 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Abmelden"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Fach-Fortschritt (nur wenn Daten vorhanden) */}
      {subjectProgress.length > 0 && (
        <div className="mt-4 flex gap-3 flex-wrap">
          {subjectProgress.map(p => {
            const accuracy = p.totalAnswered > 0
              ? Math.round((p.totalCorrect / p.totalAnswered) * 100)
              : 0;
            return (
              <div key={p.subject} className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
                <span className="text-base">{SUBJECT_ICONS[p.subject]}</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${accuracy}%` }}
                        transition={{ duration: 0.8, type: 'spring' }}
                        className={`h-full rounded-full ${SUBJECT_COLORS[p.subject]}`}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-400">{accuracy}%</span>
                  </div>
                  <span className="text-xs text-gray-400">{p.xp} XP · {p.correctStreak > 1 ? `🔥 ${p.correctStreak}` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
