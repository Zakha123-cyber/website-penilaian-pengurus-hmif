"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // ignore errors and still redirect
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleLogout} disabled={loading}>
      {loading ? "Logging out..." : "Logout"}
    </Button>
  );
}
