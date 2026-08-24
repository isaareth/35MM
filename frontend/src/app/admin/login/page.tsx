"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, setSession } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");

      const res = await fetch(`${apiUrl}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError("Usuario o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSession(data.token, data.username);
      router.push("/admin");
    } catch {
      setError("No pudimos conectar con el servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-ink min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-display font-black text-5xl text-purple text-center mb-1">35mm</p>
        <p className="font-body text-xs text-white/40 tracking-[0.3em] uppercase text-center mb-12">
          Panel administrativo
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <label className="flex flex-col gap-2">
            <span className="font-body text-xs text-white/40 tracking-widest uppercase">Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="bg-transparent border-b border-white/20 font-body text-white text-sm py-2 outline-none focus:border-neon transition-colors"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-body text-xs text-white/40 tracking-widest uppercase">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="bg-transparent border-b border-white/20 font-body text-white text-sm py-2 outline-none focus:border-neon transition-colors"
            />
          </label>

          {error && (
            <p role="alert" className="font-body text-sm text-red-400 border border-red-400/30 bg-red-400/10 px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
