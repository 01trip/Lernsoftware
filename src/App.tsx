import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { HeaderDash } from '@/features/gamification/HeaderDash';
import { TaskView } from '@/features/learning/TaskView';
import { ParentDashboard } from '@/features/parent/ParentDashboard';
import type { User } from '@/lib/types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showParentView, setShowParentView] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
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
