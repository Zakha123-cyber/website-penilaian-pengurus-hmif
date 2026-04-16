"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ChangePasswordForm() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [show, setShow] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setSuccess(false);
    };

    const toggleShow = (field: keyof typeof show) => {
        setShow((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    // Strength indicator
    const strength = (() => {
        const p = form.newPassword;
        if (!p) return 0;
        let score = 0;
        if (p.length >= 8) score++;
        if (p.length >= 12) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        return score;
    })();

    const strengthLabel = ["", "Sangat Lemah", "Lemah", "Cukup", "Kuat", "Sangat Kuat"][strength] ?? "";
    const strengthColor = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-green-600"][strength] ?? "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.newPassword !== form.confirmPassword) {
            toast.error("Konfirmasi password tidak cocok.");
            return;
        }
        if (form.newPassword.length < 8) {
            toast.error("Password baru minimal 8 karakter.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/user/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengubah password.");
            toast.success("Password berhasil diubah!");
            setSuccess(true);
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                    Password Saat Ini
                </label>
                <div className="relative">
                    <Input
                        name="currentPassword"
                        type={show.current ? "text" : "password"}
                        value={form.currentPassword}
                        onChange={handleChange}
                        placeholder="Masukkan password saat ini"
                        required
                        className="pr-10"
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        onClick={() => toggleShow("current")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                    >
                        {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50" />

            {/* New Password */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                    Password Baru
                </label>
                <div className="relative">
                    <Input
                        name="newPassword"
                        type={show.new ? "text" : "password"}
                        value={form.newPassword}
                        onChange={handleChange}
                        placeholder="Minimal 8 karakter"
                        required
                        className="pr-10"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => toggleShow("new")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                    >
                        {show.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>

                {/* Strength bar */}
                {form.newPassword && (
                    <div className="space-y-1 pt-1">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-muted"}`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Kekuatan: <span className="font-medium text-foreground">{strengthLabel}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                    Konfirmasi Password Baru
                </label>
                <div className="relative">
                    <Input
                        name="confirmPassword"
                        type={show.confirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Ulangi password baru"
                        required
                        className={`pr-10 ${form.confirmPassword && form.confirmPassword !== form.newPassword
                                ? "border-destructive focus-visible:ring-destructive/30"
                                : form.confirmPassword && form.confirmPassword === form.newPassword
                                    ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                                    : ""
                            }`}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => toggleShow("confirm")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                    >
                        {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {form.confirmPassword && form.confirmPassword !== form.newPassword && (
                    <p className="text-xs text-destructive">Password tidak cocok.</p>
                )}
            </div>

            <Button
                type="submit"
                disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
                className="w-full gap-2"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : success ? (
                    <ShieldCheck className="h-4 w-4" />
                ) : (
                    <KeyRound className="h-4 w-4" />
                )}
                {loading ? "Menyimpan..." : success ? "Password Berhasil Diubah" : "Ubah Password"}
            </Button>
        </form>
    );
}
