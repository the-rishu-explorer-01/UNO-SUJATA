import { extensionOf, sanitizeFilename } from "./files.js";

/**
 * Upload rules for drawings, 3D models and documents. Checked on the server against the file's bytes.
 * The name and the client's MIME type are never trusted.
 *
 * Deliberately NOT accepted yet:
 * - SVG: needs a verified sanitiser before any user-supplied SVG is stored or displayed.
 * - STL and OBJ: no conversion or validation pipeline yet. Convert to GLB first.
 */
const MB = 1024 * 1024;

export const PRODUCT_FILE_KINDS = ["DRAWING_2D", "MODEL_3D", "DOCUMENT"] as const;
export type ProductFileKindValue = (typeof PRODUCT_FILE_KINDS)[number];

export const MAX_FILES_PER_PRODUCT = 20;

const RULES: Record<ProductFileKindValue, { extensions: string[]; maxBytes: number; mimeType: string; label: string }> = {
  DRAWING_2D: { extensions: ["pdf"], maxBytes: 25 * MB, mimeType: "application/pdf", label: "2D engineering drawing (PDF)" },
  DOCUMENT: { extensions: ["pdf"], maxBytes: 25 * MB, mimeType: "application/pdf", label: "Technical document (PDF)" },
  MODEL_3D: { extensions: ["glb"], maxBytes: Number(process.env.MAX_MODEL_MB ?? 50) * MB, mimeType: "model/gltf-binary", label: "3D model (GLB)" },
};

export function kindRule(kind: ProductFileKindValue) {
  return RULES[kind];
}

export function isPdf(buf: Buffer): boolean {
  if (buf.length < 8 || buf.subarray(0, 5).toString("latin1") !== "%PDF-") return false;
  return buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").includes("%%EOF");
}

/**
 * A binary glTF (GLB) file starts with the magic "glTF", a version field equal to 2,
 * and a total length field equal to the file size. A mismatch means a truncated or altered file.
 */
export function isGlb(buf: Buffer, size: number): boolean {
  if (buf.length < 12) return false;
  if (buf.subarray(0, 4).toString("latin1") !== "glTF") return false;
  if (buf.readUInt32LE(4) !== 2) return false;
  return buf.readUInt32LE(8) === size;
}

export type FileCheck = { ok: true; extension: string; mimeType: string; storedExtension: string } | { ok: false; reason: string };

export function checkProductFile(kind: ProductFileKindValue, originalName: string, buf: Buffer, size: number): FileCheck {
  const rule = RULES[kind];
  const ext = extensionOf(originalName);
  if (!rule.extensions.includes(ext)) {
    return { ok: false, reason: `For ${rule.label.toLowerCase()}, choose a .${rule.extensions.join(" or .")} file.` };
  }
  if (size === 0) return { ok: false, reason: "The file is empty." };
  if (size > rule.maxBytes) return { ok: false, reason: `The file is larger than ${Math.round(rule.maxBytes / MB)} MB.` };
  const valid = ext === "pdf" ? isPdf(buf) : isGlb(buf, size);
  if (!valid) return { ok: false, reason: `This does not look like a complete ${ext.toUpperCase()} file. It may be damaged.` };
  return { ok: true, extension: ext, mimeType: rule.mimeType, storedExtension: ext };
}

export function displayName(originalName: string): string {
  return sanitizeFilename(originalName);
}
