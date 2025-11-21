import { create } from 'zustand';
import { setStorageItemAsync } from './useStorageState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'artist';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeAuth: (storedToken: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setToken: (token) => set({ token }),
  
  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),

  initializeAuth: (storedToken) => {
    if (storedToken) {
      set({ token: storedToken, isLoading: false });
      // Optionally validate the token with a /me endpoint if you have one
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token securely
      await setStorageItemAsync('auth-token', data.token);
      
      set({ 
        token: data.token, 
        user: data.user, 
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      set({ 
        isLoading: false, 
        error: errorMessage,
        token: null,
        user: null 
      });
      throw error;
    }
  },

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store token securely
      await setStorageItemAsync('auth-token', data.token);
      
      set({ 
        token: data.token, 
        user: data.user, 
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup';
      set({ 
        isLoading: false, 
        error: errorMessage,
        token: null,
        user: null 
      });
      throw error;
    }
  },

  logout: async () => {
    // Clear token from secure storage
    await setStorageItemAsync('auth-token', null);
    
    set({ 
      token: null, 
      user: null,
      error: null 
    });
  },
}));
