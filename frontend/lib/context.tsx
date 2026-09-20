'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User } from './types';
import { api } from './api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 10, // 10 seconds
      retry: 1,
    },
  },
});

interface AppContextType {
  userId: number;
  setUserId: (id: number) => void;
  activeUser: User | null;
  users: User[];
  refreshUsers: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
}

const AppContext = createContext<AppContextType>({
  userId: 1,
  setUserId: () => {},
  activeUser: null,
  users: [],
  refreshUsers: () => {},
  theme: 'light',
  setTheme: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      // Ignore or retry later
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const activeUser = users.find((u) => u.id === userId) || null;

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider
        value={{
          userId,
          setUserId,
          activeUser,
          users,
          refreshUsers: loadUsers,
          theme,
          setTheme,
        }}
      >
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
