"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";

type SuccessAlertProps = {
  message?: string | null;
  type?: "success" | "error" | "info";
};

export function SuccessAlert({ message, type = "success" }: SuccessAlertProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!message) return;

    // Hapus params alert dari URL agar tidak muncul lagi saat refresh
    router.replace(pathname, { scroll: false });

    const timer = setTimeout(() => {
      void Swal.fire({
        icon: type,
        title: message,
        timer: 1800,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [message, type, pathname, router]);

  return null;
}
