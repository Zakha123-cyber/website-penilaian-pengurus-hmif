"use client";

import * as React from "react";
import Swal from "sweetalert2";

type ConfirmFormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  message?: string;
};

export function ConfirmForm({ message = "Yakin ingin menghapus?", onSubmit, ...props }: ConfirmFormProps) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;

    // Skip prompt on the follow-up submit we trigger programmatically.
    if (form.dataset.confirmed === "true") {
      form.dataset.confirmed = "";
      onSubmit?.(event);
      return;
    }

    event.preventDefault();

    const result = await Swal.fire({
      title: message,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      focusCancel: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#e5e7eb",
    });

    if (!result.isConfirmed) return;

    form.dataset.confirmed = "true";
    form.requestSubmit();
  };

  return <form {...props} onSubmit={handleSubmit} />;
}
