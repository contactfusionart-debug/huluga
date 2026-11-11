import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { UserProfile } from '../types';
import { INITIAL_PROFILES } from '../services/mockData';
import { STORAGE_KEYS, localStorageAdapter } from '../services/localStorageAdapter';
import { isSupabaseConfigured, getSupabaseCredentials } from '../services/supabaseAdapter';
import { createClient } from '@supabase/supabase-js';
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

  // Default to Maria Santos (Treasurer)
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
          const creds = getSupabaseCredentials();
          if (creds.url && creds.anonKey) {
            const client = createClient(creds.url, creds.anonKey);
            const email = cleanUsername.includes('@')
              ? cleanUsername
              : `${cleanUsername}@huluga.local`;

            const { data, error } = await client.auth.signInWithPassword({
              email,
              password,
            });

            if (!error && data.user) {
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
        } catch {
          // If Supabase auth network call fails, fall through to local lookup
        }
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
      _password?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanUsername = username.trim().toLowerCase();
      const cleanFullName = fullName.trim();

      if (!cleanUsername || !cleanFullName) {
        return { success: false, error: 'Username and Full Name are required.' };
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
        const creds = getSupabaseCredentials();
        if (creds.url && creds.anonKey) {
          const client = createClient(creds.url, creds.anonKey);
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
