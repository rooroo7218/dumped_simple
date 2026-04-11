import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './services/supabaseClient';
import { LoginScreen } from './components/LoginScreen';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { LandingPage } from './components/LandingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  // --- Landing page: show once per device ---
  const [showLanding, setShowLanding] = useState(
    () => localStorage.getItem('seen_landing') !== 'true'
  );

  // --- Auth State ---
  const { user, handleSignOut, signInWithGoogle } = useAuth();

  // --- Onboarding gate: null = still checking, true = show, false = skip ---
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const key = `onboarding_complete_${user.id}`;
    // Fast path: localStorage already says complete
    if (localStorage.getItem(key) === 'true') {
      setShowOnboarding(false);
      return;
    }
    // Async path: check Supabase auth metadata
    supabase.auth.getUser()
      .then(({ data: { user: supaUser } }) => {
        if (supaUser?.user_metadata?.onboarding_complete) {
          localStorage.setItem(key, 'true'); // sync locally for next time
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        // If Supabase is unreachable, default to showing onboarding so the
        // user is never silently skipped past it.
        setShowOnboarding(true);
      });
  }, [user]);

  const handleOnboardingComplete = async (): Promise<void> => {
    if (user) {
      localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
      // Persist to Supabase so it survives on any device/browser
      try {
        await supabase.auth.updateUser({ data: { onboarding_complete: true } });
      } catch (err) {
        console.error('Failed to persist onboarding completion to Supabase:', err);
        // Non-blocking — user proceeds regardless
      }
    }
    setShowOnboarding(false);
  };

  const handleLandingComplete = (): void => {
    localStorage.setItem('seen_landing', 'true');
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onGetStarted={handleLandingComplete} />;
  }

  return (
    <ErrorBoundary>
      {!user ? (
        <LoginScreen
          signInWithGoogle={signInWithGoogle}
        />
      ) : showOnboarding === null ? (
        // Still resolving onboarding status — render nothing briefly.
        // AuthenticatedApp has its own DB loading guard so this gap is fine.
        null
      ) : showOnboarding === true ? (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      ) : (
        <AuthenticatedApp
          user={user}
          handleSignOut={handleSignOut}
        />
      )}
    </ErrorBoundary>
  );
};

export default App;
