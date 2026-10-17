import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Private file storage. Files are kept outside any public directory, under random names.
 * Nothing in this module is exposed over HTTP; downloads, if added later, must go through an authorised route.
 */

const STORED_NAME = /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(uploadDir(), { recursive: true, mode: 0o700 });
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Writes bytes under a random name. `wx` fails rather than overwrite an existing file. */
export async function writeUpload(buf: Buffer, extension: string): Promise<string> {
  await ensureUploadDir();
  const storedName = `${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(uploadDir(), storedName), buf, { flag: "wx", mode: 0o600 });
  return storedName;
}

/** Deletes a stored file. Refuses any name that does not match the expected pattern, which blocks path traversal. */
export async function removeUpload(storedName: string): Promise<void> {
  if (!STORED_NAME.test(storedName)) throw new Error("Refusing to delete unexpected file name");
  await fs.rm(path.join(uploadDir(), storedName), { force: true });
}
