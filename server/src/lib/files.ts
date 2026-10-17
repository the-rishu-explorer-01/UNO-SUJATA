/**
 * Upload policy for drawings. The client's file type and MIME type are NEVER trusted:
 * the extension must be allowlisted AND the file's bytes must match that format.
 */

export const MAX_FILES_PER_RFQ = 5;
export const MAX_FILE_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;

/** extension -> canonical MIME type we store and serve (never the client's claim). */
export const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  step: "model/step",
  stp: "model/step",
  dwg: "image/vnd.dwg",
  dxf: "image/vnd.dxf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** Extra defence in depth: executable, script and markup types are refused even if allowlisted by mistake. */
export const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "bat", "cmd", "com", "scr", "msi", "msp", "vbs", "vbe", "js", "jse", "wsf", "ps1",
  "sh", "bash", "bin", "run", "jar", "app", "apk", "php", "asp", "aspx", "jsp", "py", "pl", "rb",
  "html", "htm", "xhtml", "svg", "xml", "zip", "rar", "7z", "gz", "tar", "iso", "dmg", "lnk", "reg",
]);

export type FileCheck = { ok: true; extension: string; mimeType: string } | { ok: false; reason: string };

/** Reads the extension from the final dot only. "drawing.pdf.exe" is treated as ".exe". */
export function extensionOf(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/**
 * Makes a filename safe to store and display: basename only, ASCII-safe characters,
 * bounded length, no leading dots. The extension is preserved.
 */
export function sanitizeFilename(filename: string): string {
  const base = (filename.split(/[\\/]/).pop() ?? "").normalize("NFC");
  const ext = extensionOf(base);
  const stem = ext ? base.slice(0, -(ext.length + 1)) : base;
  const safeStem = stem.replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/\s+/g, " ").replace(/^[.\s_]+/, "").trim().slice(0, 100);
  return `${safeStem || "drawing"}${ext ? "." + ext.replace(/[^a-z0-9]/g, "") : ""}`;
}

/** Looks at the first bytes of the file. Returns the reason on failure. */
export function checkFileBytes(buf: Buffer, extension: string): FileCheck {
  if (!ALLOWED_EXTENSIONS[extension]) return { ok: false, reason: "This file type is not accepted." };
  if (BLOCKED_EXTENSIONS.has(extension)) return { ok: false, reason: "This file type is not accepted." };

  // Executables and scripts, whatever the extension claims.
  if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) return { ok: false, reason: "This file type is not accepted." }; // MZ
  if (buf.length >= 4 && buf.readUInt32BE(0) === 0x7f454c46) return { ok: false, reason: "This file type is not accepted." }; // ELF
  if (buf.length >= 2 && buf[0] === 0x23 && buf[1] === 0x21) return { ok: false, reason: "This file type is not accepted." }; // #!
  const head = buf.subarray(0, 4096).toString("latin1").toLowerCase();
  if (head.includes("<?php") || head.includes("<script")) return { ok: false, reason: "This file type is not accepted." };

  const mimeType = ALLOWED_EXTENSIONS[extension];
  const matches = signatureMatches(buf, extension);
  if (!matches) return { ok: false, reason: `This file does not look like a valid .${extension} file.` };
  return { ok: true, extension, mimeType };
}

function signatureMatches(buf: Buffer, ext: string): boolean {
  const ascii = (n: number) => buf.subarray(0, n).toString("latin1");
  switch (ext) {
    case "pdf":
      return ascii(5) === "%PDF-";
    case "png":
      return buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "jpg":
    case "jpeg":
      return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "dwg":
      return /^AC10\d{2}/.test(ascii(6));
    case "dxf": {
      if (ascii(18) === "AutoCAD Binary DXF") return true;
      if (buf.subarray(0, 2048).includes(0)) return false; // ASCII DXF has no NUL bytes
      return /(^|\n)\s*0\s*\r?\n\s*SECTION/.test(buf.subarray(0, 4096).toString("latin1"));
    }
    case "step":
    case "stp": {
      if (buf.subarray(0, 2048).includes(0)) return false;
      return buf.subarray(0, 1024).toString("latin1").includes("ISO-10303-21");
    }
    default:
      return false;
  }
}
