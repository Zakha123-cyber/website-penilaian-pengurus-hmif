"use client";

import { useState } from "react";

type State = {
  nim: string;
  password: string;
  loading: boolean;
  error: string | null;
};

export default function Home() {
  const [state, setState] = useState<State>({ nim: "", password: "", loading: false, error: null });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nim: state.nim, password: state.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login gagal");
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setState((s) => ({ ...s, error: err.message || "Login gagal" }));
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Login Pengurus</h1>
        <p className="mt-1 text-sm text-slate-600">Gunakan NIM dan password.</p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            NIM
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" value={state.nim} onChange={(e) => setState((s) => ({ ...s, nim: e.target.value }))} required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Password
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              value={state.password}
              onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
              required
              minLength={6}
            />
          </label>
          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <button type="submit" disabled={state.loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
            {state.loading ? "Memproses..." : "Masuk"}
          </button>
          <p className="text-xs text-slate-500">Default password seed: lihat SEED_DEFAULT_PASSWORD di .env</p>
        </form>
      </div>
    </div>
  );
}
