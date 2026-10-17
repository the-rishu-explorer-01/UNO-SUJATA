import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { audit } from "./audit.service.js";
import { CONTENT_SCHEMAS, CONTENT_DEFAULTS, isContentKey, type ContentKey } from "../lib/contentSchemas.js";

export { CONTENT_SCHEMAS, CONTENT_DEFAULTS, CONTENT_KEYS, HOMEPAGE_SECTION_KEYS, isContentKey, type ContentKey } from "../lib/contentSchemas.js";

export async function getContent(): Promise<Record<ContentKey, unknown>> {
  const rows = await prisma.siteContent.findMany({ select: { key: true, value: true } });
  const out = { ...CONTENT_DEFAULTS } as Record<ContentKey, unknown>;
  for (const row of rows) {
    if (isContentKey(row.key)) {
      const parsed = CONTENT_SCHEMAS[row.key].safeParse(row.value);
      if (parsed.success) out[row.key] = parsed.data;
    }
  }
  return out;
}

export async function saveContent(actorId: string, key: string, value: unknown) {
  if (!isContentKey(key)) throw new HttpError(404, "Unknown content key");
  const parsed = CONTENT_SCHEMAS[key].safeParse(value);
  if (!parsed.success) throw new HttpError(422, "Please check the highlighted fields.", parsed.error.flatten().fieldErrors);

  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value: parsed.data as object, updatedById: actorId },
    update: { value: parsed.data as object, updatedById: actorId },
  });
  await audit({ actorId, action: "content.updated", entityType: "SiteContent", entityId: key, summary: `Updated ${key}` });
  return parsed.data;
}
