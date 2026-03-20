import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { HeaderDash } from '@/features/gamification/HeaderDash';
import { TaskView } from '@/features/learning/TaskView';
import { ParentDashboard } from '@/features/parent/ParentDashboard';
import { pb } from '@/lib/pb';
import type { User } from '@/lib/types';

async function updateStreak(u: User): Promise<User> {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = u.lastActiveDate ? u.lastActiveDate.split('T')[0] : '';
  if (lastActive === today) return u;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = lastActive === yesterday ? (u.loginStreak || 0) + 1 : 1;

  try {
    const updated = await pb.collection('users').update<User>(u.id, {
      loginStreak: newStreak,
      lastActiveDate: new Date().toISOString(),
    });
    return updated;
  } catch {
    return u;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showParentView, setShowParentView] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as User;
        setUser(parsed);
        // Streak im Hintergrund aktualisieren
        updateStreak(parsed).then(updated => {
          setUser(updated);
          localStorage.setItem('currentUser', JSON.stringify(updated));
        });
      } catch {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = (u: User) => {
    updateStreak(u).then(updated => {
      setUser(updated);
      localStorage.setItem('currentUser', JSON.stringify(updated));
    });
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
