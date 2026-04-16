"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ChevronDown } from "lucide-react";

interface EvalTopbarProps {
    user: {
        name: string;
        nim: string;
        role: string;
        division: string;
    };
}

export function EvalTopbar({ user }: EvalTopbarProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const initials = user.name
        ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
        : "US";

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (_) { }
        window.location.href = "/";
    };

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                    <img src="/images/logo-hmif.png" alt="HMIF Logo" className="h-7 w-auto" />
                    <span className="text-sm font-bold text-slate-800 tracking-tight">
                        APD HMIF
                    </span>
                </div>

                {/* User menu */}
                <div ref={ref} className="relative">
                    <button
                        onClick={() => setOpen(v => !v)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-3 text-sm hover:bg-white hover:border-slate-300 transition-all"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1a5632] text-[11px] font-bold text-white select-none shrink-0">
                            {initials}
                        </span>
                        <span className="hidden font-medium text-slate-700 sm:block max-w-32 truncate">
                            {user.name || "User"}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown — rendered at fixed position to avoid clipping */}
                    {open && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
                            {/* User info */}
                            <div className="border-b border-slate-100 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a5632] text-sm font-bold text-white">
                                        {initials}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-slate-900">{user.name || "—"}</div>
                                        <div className="text-xs text-slate-400">NIM: {user.nim}</div>
                                        <div className="truncate text-xs text-slate-400">
                                            {user.role}{user.division ? ` · ${user.division}` : ""}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="py-1.5">
                                <button
                                    onClick={() => { setOpen(false); router.push("/evaluations/settings"); }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Settings className="h-4 w-4 text-slate-400 shrink-0" />
                                    Pengaturan Akun
                                </button>
                                <div className="mx-3 border-t border-slate-100" />
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    {loggingOut ? "Keluar..." : "Logout"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
