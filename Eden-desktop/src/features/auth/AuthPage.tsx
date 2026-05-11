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
    <main className="eden-auth">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={onSubmit} className="eden-auth-form">
        {mode === "signup" && (
          <input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Display name"
            required
          />
        )}

        <input
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          type="email"
          placeholder="Email"
          required
        />

        <input
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          type="password"
          placeholder="Password"
          required
        />

        <button type="submit" disabled={auth.isLoading}>
          {auth.isLoading ? "Working..." : mode === "login" ? "Login" : "Signup"}
        </button>
      </form>

      {auth.error && <p>{auth.error}</p>}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          auth.clearError();
        }}
      >
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
