import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export function AuthPage() {
  const navigate = useNavigate();
  const auth = useAuthStore();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (mode === "login") {
      await auth.login(email, password);
    } else {
      await auth.signup(name, email, password);
    }

    navigate("/");
  }

  return (
    <div className="eden-auth-shell">
      <main className="eden-auth">
        <div className="eden-auth-header">
          <div className="eden-brand" style={{ padding: 0 }}>
            <div className="eden-brand-mark">E</div>
            <div>
              <h1>Eden</h1>
              <p>{mode === "login" ? "Welcome back" : "Create your account"}</p>
            </div>
          </div>
          <p>
            {mode === "login"
              ? "Sign in to resume your library."
              : "Set up your listener profile in seconds."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="eden-auth-form">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Display name"
              autoComplete="name"
              required
            />
          )}

          <input
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            type="password"
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />

          <button type="submit" className="btn-primary" disabled={auth.isLoading}>
            {auth.isLoading ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {auth.error && <div className="eden-error">{auth.error}</div>}

        <button
          type="button"
          className="eden-auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            auth.clearError();
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </main>
    </div>
  );
}
