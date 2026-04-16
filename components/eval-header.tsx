"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ChevronDown, User } from "lucide-react";

interface EvalHeaderProps {
    name: string;
    nim: string;
    role: string;
    division: string;
}

export function EvalHeader({ name, nim, role, division }: EvalHeaderProps) {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const initials = name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "US";

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (_) { }
        window.location.href = "/";
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: greeting + title */}
            <div>
                <p className="text-sm text-slate-500">
                    Halo, <span className="font-medium text-slate-700">{name || "—"}</span>!
                </p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Penilaian</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Kelola tugas penilaian pengurus HMIF dari satu tempat.
                </p>
            </div>

            {/* Right: user avatar dropdown */}
            <div className="relative">
                <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm hover:bg-white hover:border-slate-300 transition-all"
                >
                    {/* Avatar */}
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a5632] text-xs font-bold text-white shrink-0 select-none">
                        {initials}
                    </span>
                    <div className="text-left hidden sm:block">
                        <div className="font-medium text-slate-800 leading-tight">{name || "User"}</div>
                        <div className="text-xs text-slate-400 leading-tight">{role}{division ? ` · ${division}` : ""}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {menuOpen && (
                    <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            {/* User info */}
                            <div className="border-b border-slate-100 px-4 py-3">
                                <div className="font-medium text-slate-900 text-sm">{name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">NIM: {nim}</div>
                                <div className="text-xs text-slate-400">{role}{division ? ` · ${division}` : ""}</div>
                            </div>
                            {/* Menu items */}
                            <div className="py-1">
                                <button
                                    onClick={() => { setMenuOpen(false); router.push("/evaluations/settings"); }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Settings className="h-4 w-4 text-slate-400" />
                                    Pengaturan Akun
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {loggingOut ? "Keluar..." : "Logout"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
