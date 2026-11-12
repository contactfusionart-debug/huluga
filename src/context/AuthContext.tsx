import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { UserProfile } from '../types';
import { INITIAL_PROFILES } from '../services/mockData';
import { STORAGE_KEYS, localStorageAdapter } from '../services/localStorageAdapter';
import {
  isSupabaseConfigured,
  getSharedSupabaseClient,
} from '../services/supabaseAdapter';
import { toISODateString } from '../utils/formatters';

export const ACTIVE_USER_STORAGE_KEY = 'huluga_active_user';

export interface AuthContextValue {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isTreasurer: boolean;
  loginWithUsername: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  registerWithUsername: (
    username: string,
    fullName: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchDemoUser: (userId: string) => void;
  availableUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getInitialUser(): UserProfile | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      if (stored === 'none' || stored === 'null') {
        return null;
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.role) {
          return parsed as UserProfile;
        }
      }
    }
  } catch {
    // Fall back to default profile on parse or storage access error
  }

  const useSupabaseAuth = import.meta.env.MODE !== 'test' && isSupabaseConfigured();
  if (useSupabaseAuth) {
    return null;
  }

  // Default to Maria Santos (Treasurer) in local/test mode
  const defaultUser = INITIAL_PROFILES[0];
  try {
    if (typeof window !== 'undefined' && window.localStorage && defaultUser) {
      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(defaultUser));
    }
  } catch {}
  return defaultUser;
}

function getInitialProfiles(): UserProfile[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as UserProfile[];
        }
      }
    }
  } catch {}
  if (import.meta.env.MODE !== 'test' && isSupabaseConfigured()) {
    return [];
  }
  return INITIAL_PROFILES;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialUser }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (initialUser !== undefined) {
      return initialUser;
    }
    return getInitialUser();
  });

  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(() => getInitialProfiles());

  const loginWithUsername = useCallback(
    async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) {
        return { success: false, error: 'Username is required.' };
      }

      // Check Supabase if configured
      if (isSupabaseConfigured() && password) {
        try {
          const client = getSharedSupabaseClient();
          if (client) {
            const email = cleanUsername.includes('@')
              ? cleanUsername
              : `${cleanUsername}@huluga.app`;

            const { data, error } = await client.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              if (import.meta.env.MODE !== 'test') {
                return { success: false, error: error.message };
              }
            } else if (data.user) {
              // Fetch user profile from Supabase profiles table
              const { data: profileData } = await client
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

              if (profileData) {
                const profile: UserProfile = {
                  id: profileData.id,
                  username: profileData.username,
                  fullName: profileData.full_name,
                  role: profileData.role,
                  joinedDate: profileData.joined_date,
                  status: profileData.status,
                  avatarUrl: profileData.avatar_url,
                  phoneNumber: profileData.phone_number,
                };
                setCurrentUser(profile);
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(profile));
                  }
                } catch {}
                return { success: true };
              }
            }
          }
        } catch (err) {
          if (import.meta.env.MODE !== 'test') {
            return {
              success: false,
              error: err instanceof Error ? err.message : 'Supabase authentication failed.',
            };
          }
          // If Supabase auth network call fails in test mode, fall through to local lookup
        }
      }

      if (import.meta.env.MODE !== 'test' && isSupabaseConfigured()) {
        return { success: false, error: 'Please enter your Supabase email/username and password.' };
      }

      // Local storage lookup
      let user = availableUsers.find(
        (u) => u.username.toLowerCase() === cleanUsername || u.id.toLowerCase() === cleanUsername
      );

      if (!user) {
        try {
          const freshProfiles = await localStorageAdapter.getProfiles();
          user = freshProfiles.find(
            (u) => u.username.toLowerCase() === cleanUsername || u.id.toLowerCase() === cleanUsername
          );
          if (user) {
            setAvailableUsers(freshProfiles);
          }
        } catch {}
      }

      if (!user) {
        user = INITIAL_PROFILES.find(
          (u) => u.username.toLowerCase() === cleanUsername || u.id.toLowerCase() === cleanUsername
        );
      }

      if (!user) {
        return { success: false, error: 'User not found.' };
      }

      if (user.status === 'suspended') {
        return { success: false, error: 'Account is suspended.' };
      }

      setCurrentUser(user);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
        }
      } catch {}

      return { success: true };
    },
    [availableUsers]
  );

  const registerWithUsername = useCallback(
    async (
      username: string,
      fullName: string,
      password?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanUsername = username.trim().toLowerCase();
      const cleanFullName = fullName.trim();

      if (!cleanUsername || !cleanFullName) {
        return { success: false, error: 'Username and Full Name are required.' };
      }

      if (import.meta.env.MODE !== 'test' && isSupabaseConfigured()) {
        if (!password || password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }
        const client = getSharedSupabaseClient();
        if (!client) {
          return { success: false, error: 'Supabase credentials are missing.' };
        }
        const email = cleanUsername.includes('@')
          ? cleanUsername
          : `${cleanUsername}@huluga.app`;

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUsername.split('@')[0],
              full_name: cleanFullName,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data.session) {
          return {
            success: false,
            error: 'Account created! Please confirm your email in Supabase (or disable email confirmation) then sign in.',
          };
        }

        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .eq('id', data.user!.id)
          .maybeSingle();

        const newProfile: UserProfile = profileData
          ? {
              id: profileData.id,
              username: profileData.username,
              fullName: profileData.full_name,
              role: profileData.role,
              avatarUrl: profileData.avatar_url || undefined,
              phoneNumber: profileData.phone_number || undefined,
              joinedDate: profileData.joined_date,
              status: profileData.status,
            }
          : {
              id: data.user!.id,
              username: cleanUsername.split('@')[0],
              fullName: cleanFullName,
              role: 'treasurer',
              joinedDate: toISODateString(new Date()),
              status: 'active',
            };

        setCurrentUser(newProfile);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(newProfile));
          }
        } catch {}
        return { success: true };
      }

      // Check if username already exists
      const existing = availableUsers.some(
        (u) => u.username.toLowerCase() === cleanUsername
      );
      if (existing) {
        return { success: false, error: 'A member with this username already exists.' };
      }

      const newProfile: UserProfile = {
        id: `user-${Date.now()}`,
        username: cleanUsername,
        fullName: cleanFullName,
        role: 'member',
        joinedDate: toISODateString(new Date()),
        status: 'active',
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      };

      try {
        await localStorageAdapter.createProfile(newProfile);
      } catch {
        // Continue even if local storage adapter had seeded conflicts
      }

      setAvailableUsers((prev) => [...prev, newProfile]);
      setCurrentUser(newProfile);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(newProfile));
        }
      } catch {}

      return { success: true };
    },
    [availableUsers]
  );

  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const client = getSharedSupabaseClient();
        if (client) {
          await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            },
          });
          return { success: true };
        }
      } catch {
        // Fall back to stub
      }
    }

    // Google login interactive demo stub
    let googleUser = availableUsers.find((u) => u.username === 'google_member');
    if (!googleUser) {
      googleUser = {
        id: 'user-google-demo',
        username: 'google_member',
        fullName: 'Demo Google Member',
        role: 'member',
        joinedDate: toISODateString(new Date()),
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      };
      try {
        await localStorageAdapter.createProfile(googleUser);
      } catch {}
      setAvailableUsers((prev) => [...prev, googleUser!]);
    }

    setCurrentUser(googleUser);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(googleUser));
      }
    } catch {}

    return { success: true };
  }, [availableUsers]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (import.meta.env.MODE !== 'test' && isSupabaseConfigured()) {
      try {
        const client = getSharedSupabaseClient();
        if (client) {
          void client.auth.signOut();
        }
      } catch {}
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, 'none');
      }
    } catch {}
  }, []);

  const switchDemoUser = useCallback(
    (userId: string) => {
      const cleanId = userId.trim().toLowerCase();
      const user =
        availableUsers.find(
          (u) => u.id.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
        ) ||
        INITIAL_PROFILES.find(
          (u) => u.id.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
        );

      if (user) {
        setCurrentUser(user);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
          }
        } catch {}
      } else {
        console.warn(`[switchDemoUser] User not found for ID or username: ${userId}`);
      }
    },
    [availableUsers]
  );

  const isAuthenticated = Boolean(currentUser);
  const isTreasurer = currentUser?.role === 'treasurer';

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated,
      isTreasurer,
      loginWithUsername,
      registerWithUsername,
      loginWithGoogle,
      logout,
      switchDemoUser,
      availableUsers,
    }),
    [
      currentUser,
      isAuthenticated,
      isTreasurer,
      loginWithUsername,
      registerWithUsername,
      loginWithGoogle,
      logout,
      switchDemoUser,
      availableUsers,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
