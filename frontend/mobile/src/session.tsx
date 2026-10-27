import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

type SessionState = { session: Session | null; loading: boolean };
const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let authEventSeen = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      if (active) { authEventSeen = true; setSession(next); setLoading(false); }
    });
    client.auth.getSession().then(({ data }) => { if (active && !authEventSeen) { setSession(data.session); setLoading(false); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>;
}

export function useSession() { return useContext(SessionContext); }
