import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { HeaderDash } from '@/features/gamification/HeaderDash';
import { TaskView } from '@/features/learning/TaskView';

export default function App() {
  const [user, setUser] = useState<any>(null);

  // Auto-login logic (for local prototype, try to load last user if wanted)
  // For now, we always show onboarding to demonstrate it, OR we can check localStorage.
  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const handleLogin = (u: any) => {
    setUser(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  if (!user) {
    return <OnboardingScreen onComplete={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        <HeaderDash user={user} onLogout={handleLogout} />
        
        <main className="flex flex-col w-full items-center justify-center pt-8">
          <TaskView user={user} onUpdate={setUser} />
        </main>
      </div>
    </div>
  );
}
