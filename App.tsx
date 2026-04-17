import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './services/supabaseClient';
import { LoginScreen } from './components/LoginScreen';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { LandingPage } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const { user, handleSignOut, signInWithGoogle, handleBypassLogin } = useAuth();

  return (
    <>
      {/* Global SVG filter — defined once here, referenced by every LiquidGlassCard */}
      <svg className="hidden" aria-hidden>
        <defs>
          <filter id="glass-blur" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.003 0.007" numOctaves="1" result="turbulence" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="200" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <ErrorBoundary>
        {!user ? (
          <LoginScreen
            signInWithGoogle={signInWithGoogle}
            handleBypassLogin={handleBypassLogin}
          />
        ) : (
          <AuthenticatedApp
            user={user}
            handleSignOut={handleSignOut}
          />
        )}
      </ErrorBoundary>
    </>
  );
};

export default App;
