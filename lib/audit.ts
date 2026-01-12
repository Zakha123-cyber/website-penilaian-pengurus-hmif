import { prisma } from "@/lib/prisma";

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
    const client: any = prisma as any;
    if (!client?.auditLog?.create) {
      // Client not regenerated / migration not applied; skip logging silently.
      return;
    }

    await client.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        success: entry.success,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ? (entry.metadata as any) : undefined,
      },
    });
  } catch (err) {
    // Swallow errors to avoid blocking main flow
    console.error("audit log failed", err);
  }
}
