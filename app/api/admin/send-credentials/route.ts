import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import crypto from "crypto";
import { eq } from "drizzle-orm";

// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || !canManageRoles(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { nims } = body;

        if (!Array.isArray(nims)) {
            return NextResponse.json({ error: "Payload 'nims' harus berupa array" }, { status: 400 });
        }

        const results = [];

        for (const nim of nims) {
            const [user] = await db.select().from(users).where(eq(users.nim, nim)).limit(1);

            if (!user) {
                results.push({ nim, status: "Failed", reason: "User tidak ditemukan berdasarkan NIM" });
                continue;
            }

            if (!user.email) {
                results.push({ nim, status: "Failed", reason: "User tidak memiliki email yang tersimpan" });
                continue;
            }

            // Generate password baru
            const newPassword = crypto.randomUUID().slice(0, 16);
            const passwordHash = await bcrypt.hash(newPassword, 10);

            // Update password di database
            await db.update(users).set({ passwordHash }).where(eq(users.nim, nim));

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

            // Kirim email berisi password baru
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Admin Sistem" <admin@hmif.com>',
                    to: user.email,
                    subject: "Kredensial Akun Anda – Sistem Penilaian HMIF",
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #f9f9f9;">
              <div style="background-color: #1a5632; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Kredensial Akun Anda</h1>
              </div>
              <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
                <p style="margin-top: 0;">Halo, <strong>${user.name}</strong>,</p>
                <p>Admin telah mengirimkan kredensial akses untuk akun Anda di <strong>Sistem Penilaian Pengurus HMIF</strong>. Password Anda telah direset. Berikut informasi login terbaru:</p>
                <div style="background-color: #f0f7f3; border-left: 4px solid #1a5632; padding: 16px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0; font-size: 14px;"><span style="color: #555;">Username (NIM):</span> <strong>${user.nim}</strong></p>
                  <p style="margin: 0; font-size: 14px;"><span style="color: #555;">Password:</span> <strong style="font-family: monospace; font-size: 16px; letter-spacing: 1px;">${newPassword}</strong></p>
                </div>
                <p style="font-size: 14px; color: #555;">Silakan login di aplikasi menggunakan kredensial di atas:</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appUrl}/login" style="display: inline-block; padding: 12px 28px; background-color: #1a5632; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">
                    Login Sekarang
                  </a>
                </div>
                <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 16px; margin-bottom: 0;">Demi keamanan, segera ganti password Anda setelah login. Jika Anda tidak merasa meminta reset akun ini, harap hubungi administrator.</p>
              </div>
            </div>
          `,
                });
                results.push({ nim, status: "Success", reason: "Email kredensial berhasil dikirim" });
            } catch (err: any) {
                results.push({ nim, status: "Failed", reason: err.message || "Gagal saat SMTP mengirim email" });
            }
        }

        return NextResponse.json({ success: true, message: "Selesai memproses nims", data: results }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Terjadi kesalahan pada server" }, { status: 500 });
    }
}
