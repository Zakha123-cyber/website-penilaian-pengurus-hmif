"use client";

import { useEffect } from "react";
import Swal from "sweetalert2";

type SuccessAlertProps = {
  message?: string | null;
  type?: "success" | "error" | "info";
};

export function SuccessAlert({ message, type = "success" }: SuccessAlertProps) {
  useEffect(() => {
    if (!message) return;

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
  }, [message, type]);

  return null;
}
