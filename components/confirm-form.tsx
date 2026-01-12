"use client";

import * as React from "react";

type ConfirmFormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  message?: string;
};

export function ConfirmForm({ message = "Yakin ingin menghapus?", onSubmit, ...props }: ConfirmFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const ok = window.confirm(message);
    if (!ok) {
      event.preventDefault();
      return;
    }
    onSubmit?.(event);
  };

  return <form {...props} onSubmit={handleSubmit} />;
}
