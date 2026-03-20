import { useEffect, useState } from 'react';
import { pb } from '@/lib/pb';
import type { User } from '@/lib/types';

interface Props {
  user: User;
  onBack: () => void;
}

interface TaskResult {
  subject: string;
  correct: boolean;
  timeToAnswerMs: number;
  answeredAt: string;
}

const SUBJECT_ICONS: Record<string, string> = {
  deutsch: '📖', mathe: '🔢', sachkunde: '🌍', englisch: '🇬🇧',
};

const SUBJECT_COLORS: Record<string, string> = {
  deutsch: 'bg-blue-400', mathe: 'bg-green-400', sachkunde: 'bg-amber-400', englisch: 'bg-purple-400',
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export function ParentDashboard({ user, onBack }: Props) {
  const [results, setResults] = useState<TaskResult[]>([]);
  const [loading, setLoading] = useState(true);
  const subjectProgress = user.subjectProgress ?? [];
  const weekDates = getWeekDates();

  useEffect(() => {
    pb.collection('task_results').getList(1, 200, {
      filter: `userId = "${user.id}"`,
      sort: '-answeredAt',
    }).then(res => {
      setResults(res.items as unknown as TaskResult[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  // Aufgaben pro Tag diese Woche
  const activityByDay = weekDates.map(date => ({
    date,
    total: results.filter(r => r.answeredAt?.startsWith(date)).length,
    correct: results.filter(r => r.answeredAt?.startsWith(date) && r.correct).length,
  }));

  const maxActivity = Math.max(...activityByDay.map(d => d.total), 1);

  // Durchschnittliche Antwortzeit
  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.timeToAnswerMs || 0), 0) / results.length / 1000)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="rounded-xl bg-white px-4 py-2 font-bold text-slate-500 shadow hover:bg-slate-50">
            ← Zurück
          </button>
          <h1 className="text-2xl font-black text-slate-800">Fortschritt von {user.name}</h1>
        </div>

        {/* Kennzahlen */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: 'Gesamt-XP', value: user.xp, color: 'text-indigo-600' },
            { label: 'Level', value: user.level, color: 'text-amber-500' },
            { label: 'Streak', value: `${user.loginStreak || 0}d`, color: 'text-orange-500' },
            { label: 'Ø Zeit', value: `${avgTime}s`, color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow text-center">
              <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Wochenübersicht */}
        <div className="rounded-2xl bg-white p-6 shadow mb-6">
          <h2 className="mb-4 text-lg font-black text-slate-700">Diese Woche</h2>
          <div className="flex items-end gap-2 h-28">
            {activityByDay.map(({ date, total, correct }, i) => {
              const isToday = date === new Date().toISOString().split('T')[0];
              const height = total === 0 ? 4 : Math.round((total / maxActivity) * 96);
              const correctHeight = total === 0 ? 0 : Math.round((correct / total) * height);
              return (
                <div key={date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-col justify-end rounded-lg overflow-hidden bg-slate-100" style={{ height: 96 }}>
                    <div className="w-full bg-slate-200 rounded-lg" style={{ height }} >
                      <div className="w-full bg-indigo-400 rounded-lg" style={{ height: correctHeight }} />
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {WEEKDAYS[i]}
                  </span>
                  {total > 0 && <span className="text-xs text-slate-400">{total}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-indigo-400 inline-block"/> Richtig</span>
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-slate-200 inline-block"/> Gesamt</span>
          </div>
        </div>

        {/* Fach-Fortschritt */}
        <div className="rounded-2xl bg-white p-6 shadow mb-4">
          <h2 className="mb-4 text-lg font-black text-slate-700">Fortschritt je Fach</h2>
          {subjectProgress.length === 0 ? (
            <p className="text-slate-400">Noch keine Aufgaben gelöst.</p>
          ) : subjectProgress.map(p => {
            const accuracy = p.totalAnswered > 0 ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0;
            return (
              <div key={p.subject} className="mb-5">
                <div className="flex justify-between mb-1 items-center">
                  <span className="font-bold text-slate-700 flex items-center gap-2">
                    {SUBJECT_ICONS[p.subject]} {p.subject.charAt(0).toUpperCase() + p.subject.slice(1)}
                  </span>
                  <div className="flex gap-4 text-sm text-slate-400">
                    <span>{p.xp} XP</span>
                    <span>{p.totalCorrect}/{p.totalAnswered} richtig</span>
                    <span className="font-bold">{accuracy}%</span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div className={`h-3 rounded-full transition-all ${SUBJECT_COLORS[p.subject]}`}
                    style={{ width: `${accuracy}%` }} />
                </div>
                {p.correctStreak > 1 && (
                  <p className="text-xs text-orange-500 mt-1">🔥 {p.correctStreak}er Korrekt-Serie</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Letzte Aktivität */}
        {results.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-black text-slate-700">Letzte Aufgaben</h2>
            <div className="space-y-2">
              {results.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                  <span className="text-lg">{SUBJECT_ICONS[r.subject] || '📚'}</span>
                  <span className={`text-sm font-bold ${r.correct ? 'text-green-500' : 'text-red-400'}`}>
                    {r.correct ? '✓ Richtig' : '✗ Falsch'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {r.timeToAnswerMs ? `${Math.round(r.timeToAnswerMs / 1000)}s` : '—'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {r.answeredAt ? new Date(r.answeredAt).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <p className="text-center text-slate-400 mt-4">Lade Aktivitäten…</p>}
      </div>
    </div>
  );
}
