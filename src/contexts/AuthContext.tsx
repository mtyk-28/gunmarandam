import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearUserState } from '../utils/storage';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      prevUserId.current = data.session?.user.id ?? null;
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      // ユーザーが切り替わった（ログアウト or 別アカウントへ）場合にキャッシュをクリア
      if (prevUserId.current !== nextUserId) {
        clearUserState();
      }
      prevUserId.current = nextUserId;
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut: () => supabase.auth.signOut().then(() => {}),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
