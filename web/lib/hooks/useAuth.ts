'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { signInAnonymously, signInWithGoogle, signInWithApple, signOut as supabaseSignOut } from '@/lib/supabase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnon = async () => {
    const { user, error } = await signInAnonymously();
    if (error) {
      throw error; // This will be caught in the login page
    }
    return user;
  };

  const signInGoogle = async () => {
    return await signInWithGoogle();
  };

  const signInApple = async () => {
    return await signInWithApple();
  };

  const signOut = async () => {
    return await supabaseSignOut();
  };

  return {
    user,
    session,
    loading,
    signInAnonymously: signInAnon,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
}
