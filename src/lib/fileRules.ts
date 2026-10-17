/**
 * Client-side drawing checks. These give instant feedback only.
 * The server enforces the same rules again (server/src/lib/files.ts) and is the authority.
 */

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = ["pdf", "step", "stp", "dwg", "dxf", "jpg", "jpeg", "png"] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

const LABELS: Record<string, string> = {
  pdf: "PDF",
  step: "STEP",
  stp: "STEP",
  dwg: "DWG",
  dxf: "DXF",
  jpg: "JPG",
  jpeg: "JPG",
  png: "PNG",
};

/** Blocked even if someone adds them to the allowlist later. */
const BLOCKED = new Set(["exe", "dll", "bat", "cmd", "com", "scr", "msi", "js", "vbs", "ps1", "sh", "bin", "jar", "apk", "php", "html", "htm", "svg", "zip", "rar", "7z"]);

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function typeLabel(name: string): string {
  return LABELS[extensionOf(name)] ?? "FILE";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Checks the name and size. Does not read the file. */
export function checkFileMeta(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (!ext || !(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext) || BLOCKED.has(ext)) {
    return "This file type is not accepted. Use PDF, STEP, DWG, DXF, JPG or PNG.";
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return `This file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  return null;
}

/** Checks the first bytes against the claimed type. Same signatures as the server. */
export function signatureOk(head: Uint8Array, ext: string): boolean {
  const ascii = (n: number) => String.fromCharCode(...head.subarray(0, n));
  const text = String.fromCharCode(...head.subarray(0, Math.min(head.length, 2048)));
  if (head.length >= 2 && head[0] === 0x4d && head[1] === 0x5a) return false; // MZ executable
  if (head.length >= 4 && head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46) return false; // ELF
  const lower = text.toLowerCase();
  if (lower.includes("<?php") || lower.includes("<script")) return false;

  switch (ext) {
    case "pdf":
      return ascii(5) === "%PDF-";
    case "png":
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b);
    case "jpg":
    case "jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "dwg":
      return /^AC10\d{2}/.test(ascii(6));
    case "dxf":
      if (ascii(18) === "AutoCAD Binary DXF") return true;
      if (head.subarray(0, Math.min(head.length, 2048)).includes(0)) return false;
      return /(^|\n)\s*0\s*\r?\n\s*SECTION/.test(text);
    case "step":
    case "stp":
      if (head.subarray(0, Math.min(head.length, 2048)).includes(0)) return false;
      return text.includes("ISO-10303-21");
    default:
      return false;
  }
}

/** Reads only the first 2 KB of a file to check its signature. */
export async function fileSignatureOk(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 2048).arrayBuffer());
  return signatureOk(head, extensionOf(file.name));
}
