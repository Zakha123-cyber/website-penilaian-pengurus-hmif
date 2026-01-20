"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type State = {
  nim: string;
  password: string;
  loading: boolean;
  error: string | null;
};

export default function Home() {
  const [state, setState] = useState<State>({ nim: "", password: "", loading: false, error: null });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

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
      const data = await res.json();
      const role = data?.role as string | undefined;
      const destination = role === "ADMIN" ? "/dashboard" : "/evaluations";
      window.location.href = destination;
    } catch (err: any) {
      setState((s) => ({ ...s, error: err.message || "Login gagal" }));
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-20 w-20">
            <Image src="/images/logo-hmif.png" alt="Logo HMIF" fill sizes="80px" className="object-contain" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="absolute h-24 w-24 rounded-full border border-white/10" />
              <span className="absolute h-24 w-24 animate-spin rounded-full border-2 border-transparent border-t-white border-l-white drop-shadow-[0_0_12px_rgba(255,255,255,0.65)]" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">HMIF UNEJ</p>
            <h1 className="text-2xl font-semibold">Website Penilaian Pengurus</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Sistem Penilaian Pengurus HMIF
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">Selamat Datang di Website Penilaian Pengurus HMIF</h1>
            <p className="text-base text-white/80 lg:text-lg">Kelola evaluasi, pantau progres, dan pastikan transparansi penilaian dengan dashboard yang rapi dan cepat.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["Penilaian terstruktur", "Rekap otomatis", "Akses aman", "Feedback anonim"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 shadow-sm backdrop-blur-md">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 w-full max-w-md flex-1 lg:mt-0">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
            <div className="absolute -right-12 -top-12 h-28 w-28">
              <Image src="/images/logo-hmif.png" alt="Logo HMIF" fill sizes="80px" className="object-contain rotate-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Mulai</p>
              <h2 className="text-2xl font-semibold">Masuk ke Dashboard</h2>
              <p className="text-sm text-white/70">Gunakan NIM dan password Anda untuk melanjutkan.</p>
            </div>

            <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
              <label className="flex flex-col gap-2 text-sm text-white/80">
                <span>NIM</span>
                <input
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none ring-0 transition focus:border-cyan-300/70 focus:bg-white/10"
                  value={state.nim}
                  onChange={(e) => setState((s) => ({ ...s, nim: e.target.value }))}
                  required
                  placeholder="Contoh: 135xxxx"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white/80">
                <span>Password</span>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none ring-0 transition focus:border-cyan-300/70 focus:bg-white/10"
                  value={state.password}
                  onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                />
              </label>
              {state.error ? <p className="text-sm text-amber-200">{state.error}</p> : null}
              <button
                type="submit"
                disabled={state.loading}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-linear-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-400/30 disabled:opacity-60"
              >
                {state.loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
