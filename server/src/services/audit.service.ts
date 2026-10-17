import { prisma } from "../utils/prisma.js";

/** Records a staff action. Failures are logged but do not block the action, so auditing never causes data loss silently. */
export async function audit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary.slice(0, 500),
      },
    });
  } catch (err) {
    console.error("[audit] failed to record:", params.action, err instanceof Error ? err.message : err);
  }
}

export async function auditFor(entityType: string, entityId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, summary: true, createdAt: true, actor: { select: { name: true } } },
  });
}

export async function recentAudit(limit = 20) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, summary: true, entityType: true, createdAt: true, actor: { select: { name: true } } },
  });
}
