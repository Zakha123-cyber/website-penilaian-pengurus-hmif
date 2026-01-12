import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Selamat datang</p>
              <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">
                Role: {session.role} · Periode: {session.periodId}
              </p>
              {session.mustSuggestPasswordChange && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Disarankan mengganti password default Anda.</p>}
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">Logout</button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/change-password" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Ganti Password</h2>
            <p className="text-sm text-slate-600">Perbarui password akun Anda.</p>
          </Link>
          <Link href="/dashboard/periods" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Periode</h2>
            <p className="text-sm text-slate-600">Atur periode aktif dan rentang tahun.</p>
          </Link>
          <Link href="/dashboard/divisions" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Divisi</h2>
            <p className="text-sm text-slate-600">Kelola daftar divisi.</p>
          </Link>
          <Link href="/dashboard/users" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">User</h2>
            <p className="text-sm text-slate-600">Kelola akun, role, dan password.</p>
          </Link>
          <Link href="/dashboard/prokers" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Proker</h2>
            <p className="text-sm text-slate-600">Kelola proker per periode dan panitia.</p>
          </Link>
          <Link href="/dashboard/indicators" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Indikator</h2>
            <p className="text-sm text-slate-600">Kelola indikator penilaian dan status aktif.</p>
          </Link>
          <Link href="/dashboard/events" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Event Penilaian</h2>
            <p className="text-sm text-slate-600">Buat event, rentang tanggal, dan snapshot indikator.</p>
          </Link>
          <Link href="/dashboard/results" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
            <h2 className="text-base font-semibold text-slate-900">Reporting</h2>
            <p className="text-sm text-slate-600">Lihat rekap skor, kategori, indikator, dan export CSV.</p>
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">Modul berikutnya: evaluasi lapangan, penugasan penilai, dan laporan ringkasan hasil.</div>
      </div>
    </div>
  );
}
