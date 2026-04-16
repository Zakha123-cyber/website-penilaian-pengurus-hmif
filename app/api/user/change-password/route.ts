import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { currentPassword, newPassword, confirmPassword } = body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({ error: "Semua field harus diisi." }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ error: "Konfirmasi password tidak cocok." }, { status: 400 });
        }

        const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
        }

        const isCorrect = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCorrect) {
            return NextResponse.json({ error: "Password saat ini tidak benar." }, { status: 400 });
        }

        if (currentPassword === newPassword) {
            return NextResponse.json({ error: "Password baru tidak boleh sama dengan password lama." }, { status: 400 });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await db
            .update(users)
            .set({ passwordHash: newHash, passwordUpdatedAt: new Date() })
            .where(eq(users.id, user.id));

        return NextResponse.json({ success: true, message: "Password berhasil diubah." }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Terjadi kesalahan pada server." }, { status: 500 });
    }
}
