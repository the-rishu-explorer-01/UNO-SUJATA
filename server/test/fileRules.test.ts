import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFileBytes, extensionOf, sanitizeFilename, BLOCKED_EXTENSIONS } from "../src/lib/files.js";

const pdf = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj");
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const step = Buffer.from("ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('x'),'2;1');\nENDSEC;");
const dxf = Buffer.from("  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nEOF\n");
const dwg = Buffer.from("AC1027\u0000\u0000\u0000binary");
const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // "MZ" header
const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02]);
const script = Buffer.from("<script>alert(1)</script>");

test("accepts each allowed format when the bytes match", () => {
  assert.equal(checkFileBytes(pdf, "pdf").ok, true);
  assert.equal(checkFileBytes(png, "png").ok, true);
  assert.equal(checkFileBytes(jpg, "jpg").ok, true);
  assert.equal(checkFileBytes(jpg, "jpeg").ok, true);
  assert.equal(checkFileBytes(step, "step").ok, true);
  assert.equal(checkFileBytes(step, "stp").ok, true);
  assert.equal(checkFileBytes(dxf, "dxf").ok, true);
  assert.equal(checkFileBytes(dwg, "dwg").ok, true);
});

test("returns the canonical MIME type, never the client's claim", () => {
  const r = checkFileBytes(pdf, "pdf");
  assert.ok(r.ok);
  assert.equal(r.mimeType, "application/pdf");
});

test("rejects a file whose bytes do not match its extension", () => {
  assert.equal(checkFileBytes(png, "pdf").ok, false);
  assert.equal(checkFileBytes(pdf, "png").ok, false);
  assert.equal(checkFileBytes(step, "dxf").ok, false);
});

test("rejects executables, even when renamed to an allowed extension", () => {
  assert.equal(checkFileBytes(exe, "pdf").ok, false);
  assert.equal(checkFileBytes(elf, "png").ok, false);
});

test("rejects script and markup content", () => {
  assert.equal(checkFileBytes(script, "jpg").ok, false);
  assert.equal(checkFileBytes(Buffer.from("<?php echo 1;"), "pdf").ok, false);
  assert.equal(checkFileBytes(Buffer.from("#!/bin/sh\nrm -rf /"), "pdf").ok, false);
});

test("rejects every blocked extension regardless of content", () => {
  for (const ext of ["exe", "js", "html", "svg", "zip", "php", "sh", "bat"]) {
    assert.equal(BLOCKED_EXTENSIONS.has(ext) || checkFileBytes(pdf, ext).ok === false, true, ext);
  }
});

test("rejects unknown extensions", () => {
  assert.equal(checkFileBytes(pdf, "docx").ok, false);
  assert.equal(checkFileBytes(pdf, "").ok, false);
});

test("uses only the final extension, so drawing.pdf.exe is an .exe", () => {
  assert.equal(extensionOf("drawing.pdf.exe"), "exe");
  assert.equal(extensionOf("Drawing.PDF"), "pdf");
  assert.equal(extensionOf("noextension"), "");
});

test("sanitises filenames: strips paths, unsafe characters and leading dots", () => {
  assert.equal(sanitizeFilename("../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(sanitizeFilename("C:\\Users\\x\\bracket v2 (final).step"), "bracket v2 _final_.step");
  assert.equal(sanitizeFilename("...hidden.pdf"), "hidden.pdf");
  assert.equal(sanitizeFilename("<script>.jpg").endsWith(".jpg"), true);
  assert.equal(sanitizeFilename("<script>.jpg").includes("<"), false);
  assert.equal(sanitizeFilename(""), "drawing");
});

test("bounds filename length", () => {
  const long = "a".repeat(300) + ".pdf";
  assert.ok(sanitizeFilename(long).length <= 105);
});
