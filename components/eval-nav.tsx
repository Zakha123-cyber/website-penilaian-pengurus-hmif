"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/evaluations", label: "Ringkasan", exact: true },
    { href: "/evaluations/open", label: "Event Dibuka", exact: false },
    { href: "/evaluations/progress", label: "Progres", exact: false },
    { href: "/evaluations/completed", label: "Selesai", exact: false },
];

export function EvalNav() {
    const pathname = usePathname();

    return (
        <nav className="flex gap-0 overflow-x-auto">
            {navItems.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${isActive
                                ? "text-[#1a5632] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1a5632] after:rounded-full"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
