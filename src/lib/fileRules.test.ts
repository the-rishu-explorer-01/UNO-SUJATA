import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFileMeta, extensionOf, signatureOk, formatBytes, typeLabel, MAX_FILE_BYTES } from "./fileRules";

const enc = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));

test("accepts allowed extensions with a plausible size", () => {
  for (const name of ["a.pdf", "b.STEP", "c.stp", "d.dwg", "e.dxf", "f.jpg", "g.jpeg", "h.png"]) {
    assert.equal(checkFileMeta({ name, size: 1000 }), null, name);
  }
});

test("rejects executables and unlisted types with a customer-safe message", () => {
  const msg = checkFileMeta({ name: "setup.exe", size: 100 });
  assert.ok(msg && msg.includes("not accepted"));
  assert.ok(checkFileMeta({ name: "notes.docx", size: 100 }));
  assert.ok(checkFileMeta({ name: "page.html", size: 100 }));
  assert.ok(checkFileMeta({ name: "noext", size: 100 }));
});

test("uses the final extension, so drawing.pdf.exe is rejected", () => {
  assert.ok(checkFileMeta({ name: "drawing.pdf.exe", size: 100 }));
  assert.equal(extensionOf("drawing.pdf.exe"), "exe");
});

test("rejects empty and oversized files", () => {
  assert.ok(checkFileMeta({ name: "a.pdf", size: 0 }));
  assert.ok(checkFileMeta({ name: "a.pdf", size: MAX_FILE_BYTES + 1 }));
  assert.equal(checkFileMeta({ name: "a.pdf", size: MAX_FILE_BYTES }), null);
});

test("signature checks match the claimed type", () => {
  assert.equal(signatureOk(enc("%PDF-1.4 ..."), "pdf"), true);
  assert.equal(signatureOk(enc("%PDF-1.4 ..."), "png"), false);
  assert.equal(signatureOk(enc("\x89PNG\r\n\x1a\n...."), "png"), true);
  assert.equal(signatureOk(enc("\xff\xd8\xff\xe0"), "jpg"), true);
  assert.equal(signatureOk(enc("ISO-10303-21;\nHEADER;"), "step"), true);
  assert.equal(signatureOk(enc("  0\nSECTION\n  2\nHEADER"), "dxf"), true);
  assert.equal(signatureOk(enc("AC1027binary"), "dwg"), true);
});

test("rejects executables and scripts even with an allowed extension", () => {
  assert.equal(signatureOk(enc("MZ\x90\x00"), "pdf"), false);
  assert.equal(signatureOk(enc("<script>x</script>"), "jpg"), false);
});

test("formats sizes and labels for display", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB");
  assert.equal(typeLabel("x.stp"), "STEP");
  assert.equal(typeLabel("x.unknown"), "FILE");
});
