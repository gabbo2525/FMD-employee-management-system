import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'employee' | null;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
}

interface AuthState {
  user: AuthUser | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: User) => {
    try {
      // First, try to find the profile by the user's auth ID
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!data && supabaseUser.email) {
        // Not found by ID — the admin may have created this account, so look up by email
        const { data: emailData } = await supabase
          .from('users')
          .select('*')
          .eq('email', supabaseUser.email)
          .maybeSingle();

        if (emailData) {
          // Found by email! Update the row's ID to match the real auth ID so future lookups work
          await supabase
            .from('users')
            .update({ id: supabaseUser.id })
            .eq('email', supabaseUser.email);
          data = { ...emailData, id: supabaseUser.id };
        }
      }

      if (!data) {
        // Truly new user with no profile at all — auto-create a minimal one
        const fallbackName = supabaseUser.user_metadata?.full_name
          || supabaseUser.email?.split('@')[0]
          || 'Employee';
        const role = supabaseUser.email?.includes('admin') ? 'admin' : 'employee';

        const { data: newData } = await supabase
          .from('users')
          .insert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            full_name: fallbackName,
            role: role,
          })
          .select()
          .maybeSingle();

        data = newData || { full_name: fallbackName, role };
      }

      if (data) {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: data.full_name || 'Employee',
          role: data.role as UserRole,
          employeeId: `EMP-${supabaseUser.id.substring(0, 4).toUpperCase()}`,
        });
      }
    } catch (e) {
      console.error('Error fetching user profile', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = async (updates: Partial<AuthUser>) => {
    if (!user) return;
    
    // Optimistic update
    const updated = { ...user, ...updates };
    setUser(updated);
    
    // Update Supabase Database if name changed
    if (updates.name) {
      const { error } = await supabase
        .from('users')
        .update({ full_name: updates.name })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating user name:', error);
        // Revert on error
        setUser(user);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || null,
      isLoading,
      isAuthenticated: !!user,
      signOut,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
