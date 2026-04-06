import { type PropsWithChildren, createContext, use, useEffect } from "react";
import type { User } from "./auth-store";
import { useAuthStore } from "./auth-store";
import { useStorageState } from "./useStorageState";

interface AuthContextType {
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string, name: string) => Promise<void>;
	signOut: () => Promise<void>;
	session?: string | null;
	user: User | null;
	isLoading: boolean;
	error: string | null;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
	signIn: async () => {},
	signUp: async () => {},
	signOut: async () => {},
	session: null,
	user: null,
	isLoading: false,
	error: null,
	clearError: () => {},
});

// Use this hook to access the user info.
export function useSession() {
	const value = use(AuthContext);
	if (!value) {
		throw new Error("useSession must be wrapped in a <SessionProvider />");
	}

	return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
	const [[isLoadingStorage, session], setSession] =
		useStorageState("auth-token");
	const {
		user,
		token,
		isLoading: isAuthLoading,
		error,
		login,
		signup,
		logout,
		clearError,
		initializeAuth,
		setToken,
	} = useAuthStore();

	// Initialize auth state from stored token
	useEffect(() => {
		if (!isLoadingStorage) {
			initializeAuth(session);
		}
	}, [isLoadingStorage, session, initializeAuth]);

	// Sync Zustand token with secure storage
	useEffect(() => {
		if (token && token !== session) {
			setSession(token);
		}
	}, [token, session, setSession]);

	const isLoading = isLoadingStorage || isAuthLoading;

	return (
		<AuthContext.Provider
			value={{
				signIn: async (email: string, password: string) => {
					await login(email, password);
				},
				signUp: async (email: string, password: string, name: string) => {
					await signup(email, password, name);
				},
				signOut: async () => {
					await logout();
					setSession(null);
				},
				session: token ?? session,
				user,
				isLoading,
				error,
				clearError,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
