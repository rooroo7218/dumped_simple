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
            options: {
                redirectTo
            }
        });
        if (error) console.error("❌ [Auth] Login failed:", error.message);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('dumped_user');
    };

    const handleBypassLogin = () => {
        const tester = {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Tester McGee',
            email: 'test@dumped.ai',
            picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Millennial',
            lastLogin: Date.now()
        };
        setUser(tester);
        localStorage.setItem('dumped_user', JSON.stringify(tester));
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                const profile: UserProfile = {
                    id: session.user.id,
                    name: session.user.user_metadata.full_name,
                    email: session.user.email!,
                    picture: session.user.user_metadata.avatar_url,
                    lastLogin: Date.now()
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
        handleSignOut,
        handleBypassLogin
    };
};
