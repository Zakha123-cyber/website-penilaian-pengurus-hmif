import { db } from "@/lib/db";
import { auditLogs } from "@/lib/schema";

export type AuditPayload = {
  action: string;
  userId?: string | null;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAudit(entry: AuditPayload) {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: entry.action,
      userId: entry.userId ?? null,
      success: entry.success,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: entry.metadata ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    // Swallow errors to avoid blocking main flow
    console.error("audit log failed", err);
  }
}
