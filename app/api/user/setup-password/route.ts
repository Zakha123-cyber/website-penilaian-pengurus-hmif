import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Ambil secret dari environment (direkomendasikan SETUP_JWT_SECRET khusus, namun fallback ke AUTH_SECRET)
const SECRET = new TextEncoder().encode(
    process.env.SETUP_JWT_SECRET || process.env.AUTH_SECRET || "default_secret"
);

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { token, new_password } = body;

        // 1. Validasi input
        if (!token || !new_password) {
            return NextResponse.json({ error: "Token dan new_password tidak boleh kosong." }, { status: 400 });
        }

        if (new_password.length < 6) {
            return NextResponse.json({ error: "Password minimal harus 6 karakter." }, { status: 400 });
        }

        let payload: any;

        try {
            // 2. Verifikasi JWT
            const verified = await jwtVerify(token, SECRET);
            payload = verified.payload;
        } catch (err: any) {
            return NextResponse.json(
                { error: "Token reset password tidak valid atau sudah kedaluwarsa." },
                { status: 401 }
            );
        }

        // 3. Ambil nim dari payload JWT
        const nim = payload.nim;
        if (!nim || typeof nim !== "string") {
            return NextResponse.json(
                { error: "Token tidak mengandung informasi user yang valid (nim)." },
                { status: 400 }
            );
        }

        const [user] = await db.select().from(users).where(eq(users.nim, nim)).limit(1);
        if (!user) {
            return NextResponse.json(
                { error: "User berbasis NIM yang ada di token tidak ditemukan." },
                { status: 404 }
            );
        }

        // 4. Hash password baru
        const passwordHash = await bcrypt.hash(new_password, 10);

        // 5. Update password
        await db
            .update(users)
            .set({ passwordHash, passwordUpdatedAt: new Date() })
            .where(eq(users.id, user.id));

        return NextResponse.json(
            {
                success: true,
                message: "Password berhasil disimpan dan diubah. Silahkan login menggunakan password baru Anda.",
            },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Terjadi kesalahan pada internal server." }, { status: 500 });
    }
}
