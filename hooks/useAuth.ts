import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<UserProfile | null>(() => {
        const saved = localStorage.getItem('dumped_user');
        return saved ? JSON.parse(saved) : null;
    });

    const signInWithGoogle = async () => {
        const redirectTo = window.location.origin.replace(/\/$/, '');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });
        if (error) console.error("❌ [Auth] Google Login failed:", error.message);
    };

    const signInWithApple = async () => {
        const redirectTo = window.location.origin.replace(/\/$/, '');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: { redirectTo }
        });
        if (error) console.error("❌ [Auth] Apple Login failed:", error.message);
    };

    const signInAnonymously = async () => {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.error("❌ [Auth] Anonymous login failed:", error.message);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('dumped_user');
    };

    const handleBypassLogin = () => {
        signInAnonymously();
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                const profile: UserProfile = {
                    id: session.user.id,
                    name: session.user.user_metadata.full_name || 'Guest',
                    email: session.user.email || 'guest@dumped.ai',
                    picture: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.id}`,
                    lastLogin: Date.now(),
                    onboarding_completed: session.user.user_metadata.onboarding_completed,
                    isGuest: !!session.user.is_anonymous
                };
                setUser(profile);
                localStorage.setItem('dumped_user', JSON.stringify(profile));
            } else if (event === 'SIGNED_OUT') {
                // Only wipe the cached user on an explicit sign-out —
                // not on transient null-session events (page reload, token refresh)
                setUser(null);
                localStorage.removeItem('dumped_user');
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    return {
        user,
        setUser,
        signInWithGoogle,
        signInWithApple,
        signInAnonymously,
        handleSignOut,
        handleBypassLogin
    };
};
