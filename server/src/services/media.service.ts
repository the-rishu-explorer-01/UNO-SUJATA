import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { HttpError } from "../utils/http.js";

/**
 * Public product images. Stored in MEDIA_DIR, which is served read-only at /media.
 * Kept separate from the private drawing store, so nothing in drawings is ever publicly reachable.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

export function mediaDir(): string {
  return path.resolve(process.env.MEDIA_DIR ?? "./public-media");
}

export async function ensureMediaDir(): Promise<void> {
  await fs.mkdir(mediaDir(), { recursive: true, mode: 0o755 });
}

/** Detects the real image type from its bytes. The client's file name and type are ignored. */
export function detectImage(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

export async function storeImage(file: { buffer: Buffer; size: number }): Promise<{ url: string }> {
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Image is too large. The maximum is 5 MB.");
  const ext = detectImage(file.buffer);
  if (!ext) throw new HttpError(422, "Upload a JPG, PNG or WebP image.");
  await ensureMediaDir();
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(mediaDir(), name), file.buffer, { flag: "wx", mode: 0o644 });
  return { url: `/media/${name}` };
}

/** Public PDF documents (catalogues, brochures). Limit is generous for catalogues but still bounded. */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** A real PDF starts with %PDF- and ends with %%EOF somewhere near the end. */
export function isPdf(buf: Buffer): boolean {
  if (buf.length < 8 || buf.subarray(0, 5).toString("latin1") !== "%PDF-") return false;
  return buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").includes("%%EOF");
}

export async function storeDocument(file: { buffer: Buffer; size: number }): Promise<{ url: string; sizeBytes: number }> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new HttpError(413, "The document is too large. The maximum is 20 MB.");
  if (!isPdf(file.buffer)) throw new HttpError(422, "Upload a PDF file. The file does not look like a complete PDF.");
  await ensureMediaDir();
  const name = `${randomUUID()}.pdf`;
  await fs.writeFile(path.join(mediaDir(), name), file.buffer, { flag: "wx", mode: 0o644 });
  return { url: `/media/${name}`, sizeBytes: file.size };
}

/** Removes an image or document by its public URL. Only names of the exact expected form are accepted. */
export async function removeImage(url: string): Promise<void> {
  const name = url.replace(/^\/media\//, "");
  if (!NAME.test(name)) return;
  await fs.rm(path.join(mediaDir(), name), { force: true });
}
