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
