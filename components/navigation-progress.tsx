"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";

// Singleton event bus agar bisa dipanggil dari luar component
type Listener = (loading: boolean) => void;
const listeners = new Set<Listener>();

export const navigationLoadingBus = {
  start: () => listeners.forEach((fn) => fn(true)),
  stop:  () => listeners.forEach((fn) => fn(false)),
};

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setLoading(true);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setLoading(false);
  }, []);

  // Daftar listener ke bus
  useEffect(() => {
    listeners.add(setLoading);
    return () => { listeners.delete(setLoading); };
  }, []);

  // Intercept semua klik pada <a> yang merupakan internal link
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Abaikan: link eksternal, anchor (#), download, target _blank, modifier keys
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank" ||
        e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
      ) return;

      show();
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [show]);

  // Ketika route sudah benar-benar berubah → sembunyikan
  useEffect(() => {
    hide();
  }, [pathname, searchParams, hide]);

  // Fade-out lalu unmount
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm transition-opacity duration-300 ${
        loading ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <Image
            src="/images/logo-hmif.png"
            alt="Loading"
            fill
            sizes="64px"
            className="object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="absolute h-20 w-20 rounded-full border border-white/10" />
            <span className="absolute h-20 w-20 animate-spin rounded-full border-2 border-transparent border-t-white border-l-white drop-shadow-[0_0_12px_rgba(255,255,255,0.65)]" />
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">Memuat...</p>
      </div>
    </div>
  );
}
