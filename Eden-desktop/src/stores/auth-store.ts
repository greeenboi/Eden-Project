import { create } from "zustand";
import { login, me, signup } from "@/services/api/auth";
import { readStorage, removeStorage, writeStorage } from "@/lib/storage";
import type { AuthUser } from "@/types/contracts";

const AUTH_KEY = "eden-desktop-auth";

interface StoredAuth {
  token: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  logoutLocal: () => void;
  clearError: () => void;
}

function persistToken(token: string | null): void {
  writeStorage<StoredAuth>(AUTH_KEY, { token });
}

function getStoredToken(): string | null {
  return readStorage<StoredAuth>(AUTH_KEY, { token: null }).token;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ initialized: true, token: null, user: null });
      return;
    }

    set({ token, isLoading: true, error: null });

    try {
      const response = await me();
      set({
        user: response.user,
        isLoading: false,
        initialized: true,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restore session";
      set({
        isLoading: false,
        initialized: true,
        error: message,
      });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await login(email, password);
      persistToken(response.token);
      set({
        token: response.token,
        user: response.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      set({ isLoading: false, error: message, user: null, token: null });
      throw error;
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await signup(email, password, name);
      persistToken(response.token);
      set({
        token: response.token,
        user: response.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      set({ isLoading: false, error: message, user: null, token: null });
      throw error;
    }
  },

  logout: () => {
    removeStorage(AUTH_KEY);
    set({ token: null, user: null, error: null });
  },

  logoutLocal: () => {
    removeStorage(AUTH_KEY);
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));
