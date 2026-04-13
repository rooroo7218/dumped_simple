import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './services/supabaseClient';
import { LoginScreen } from './components/LoginScreen';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { LandingPage } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  // --- Landing page: show once per device ---
  const [showLanding, setShowLanding] = useState(
    () => localStorage.getItem('seen_landing') !== 'true'
  );

  // --- Auth State ---
  const { user, handleSignOut, signInWithGoogle } = useAuth();

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
