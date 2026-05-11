import { apiRequest } from "@/services/http";
import type { AuthResponse, UserResponse } from "@/types/contracts";

export function login(email: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: { email, password },
      signal,
    },
  );
}

export function signup(
  email: string,
  password: string,
  name: string,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    "/api/auth/signup",
    {
      method: "POST",
      body: { email, password, name },
      signal,
    },
  );
}

export function me(signal?: AbortSignal): Promise<UserResponse> {
  return apiRequest<UserResponse>(
    "/api/auth/me",
    {
      method: "GET",
      authenticated: true,
      signal,
    },
  );
}
