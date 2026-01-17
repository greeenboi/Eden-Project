import { identifyDevice } from "vexo-analytics";
import { create } from "zustand";
import { API_BASE_URL } from "../constants/constants";
import { authFailed, authSuccess, userLoggedOut } from "./analytics";
import { setStorageItemAsync } from "./useStorageState";

export interface User {
	id: string;
	email: string;
	name: string;
	role: "user" | "artist";
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
	initializeAuth: (storedToken: string | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	token: null,
	isLoading: false,
	error: null,

	setToken: (token) => set({ token }),

	setUser: (user) => set({ user }),

	clearError: () => set({ error: null }),

	initializeAuth: async (storedToken) => {
		if (!storedToken) {
			set({ isLoading: false });
			return;
		}

		set({ token: storedToken, isLoading: true });

		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${storedToken}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				set({ user: data.user, isLoading: false });
			} else {
				// Token is invalid/expired, clear auth state
				await setStorageItemAsync("auth-token", null);
				set({ token: null, user: null, isLoading: false });
			}
		} catch {
			// Network error - keep token, user will be null but can retry
			set({ isLoading: false });
		}
	},

	login: async (email: string, password: string) => {
		set({ isLoading: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Login failed");
			}

			// Store token securely
			await setStorageItemAsync("auth-token", data.token);

			// Identify device for Vexo analytics
			await identifyDevice(data.user?.email ?? null);

			// Track successful login
			authSuccess("login");

			set({
				token: data.token,
				user: data.user,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred during login";
			authFailed("login", errorMessage);
			set({
				isLoading: false,
				error: errorMessage,
				token: null,
				user: null,
			});
			throw error;
		}
	},

	signup: async (email: string, password: string, name: string) => {
		set({ isLoading: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password, name }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Signup failed");
			}

			// Store token securely
			await setStorageItemAsync("auth-token", data.token);

			// Identify device for Vexo analytics
			await identifyDevice(data.user?.email ?? null);

			// Track successful signup
			authSuccess("signup");

			set({
				token: data.token,
				user: data.user,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred during signup";
			authFailed("signup", errorMessage);
			set({
				isLoading: false,
				error: errorMessage,
				token: null,
				user: null,
			});
			throw error;
		}
	},

	logout: async () => {
		// Track logout event
		userLoggedOut();

		// Clear token from secure storage
		await setStorageItemAsync("auth-token", null);

		// Anonymize device for Vexo analytics
		await identifyDevice(null);

		set({
			token: null,
			user: null,
			error: null,
		});
	},
}));
