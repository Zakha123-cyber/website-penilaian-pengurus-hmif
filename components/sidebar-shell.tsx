"use client";

import React from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type SidebarShellProps = {
  user?: {
    name: string;
    email?: string | null;
    avatar?: string | null;
  };
  sidebarStyle?: React.CSSProperties;
  children: React.ReactNode;
};

export function SidebarShell({ user, sidebarStyle, children }: SidebarShellProps) {
  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
