import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProductFile, isGlb, isPdf, kindRule } from "../src/lib/productFileRules.js";

const pdf = Buffer.from("%PDF-1.7\n1 0 obj\nendobj\n%%EOF\n");

function glb(totalLength = 20, version = 2): Buffer {
  const b = Buffer.alloc(totalLength);
  b.write("glTF", 0, "latin1");
  b.writeUInt32LE(version, 4);
  b.writeUInt32LE(totalLength, 8);
  return b;
}

test("PDF detection needs the header and the end-of-file marker", () => {
  assert.equal(isPdf(pdf), true);
  assert.equal(isPdf(Buffer.from("%PDF-1.7\ntruncated")), false);
  assert.equal(isPdf(Buffer.from("<html>%%EOF</html>")), false);
});

test("GLB detection checks magic, version 2, and that the declared length equals the file size", () => {
  assert.equal(isGlb(glb(20), 20), true);
  assert.equal(isGlb(glb(20, 1), 20), false, "wrong version");
  assert.equal(isGlb(glb(20), 24), false, "declared length does not match size: truncated or altered");
  const bad = glb(20);
  bad.write("JSON", 0, "latin1");
  assert.equal(isGlb(bad, 20), false, "wrong magic");
});

test("a valid drawing PDF is accepted and stored as application/pdf", () => {
  const r = checkProductFile("DRAWING_2D", "bracket-drawing.pdf", pdf, pdf.length);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.mimeType, "application/pdf");
});

test("a valid GLB model is accepted for 3D models only", () => {
  const m = glb(20);
  assert.equal(checkProductFile("MODEL_3D", "pin.glb", m, m.length).ok, true);
  const refused = checkProductFile("DRAWING_2D", "pin.glb", m, m.length);
  assert.equal(refused.ok, false, "a GLB is not a drawing");
});

test("SVG, STL and OBJ are refused: no safe pipeline exists for them yet", () => {
  assert.equal(checkProductFile("DRAWING_2D", "drawing.svg", Buffer.from("<svg/>"), 6).ok, false);
  assert.equal(checkProductFile("MODEL_3D", "pin.stl", Buffer.from("solid pin"), 9).ok, false);
  assert.equal(checkProductFile("MODEL_3D", "pin.obj", Buffer.from("v 0 0 0"), 7).ok, false);
});

test("an executable renamed to .pdf is refused, because the bytes are not a PDF", () => {
  const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0]);
  assert.equal(checkProductFile("DRAWING_2D", "setup.pdf", exe, exe.length).ok, false);
});

test("a double extension is judged by the final extension only", () => {
  assert.equal(checkProductFile("DRAWING_2D", "drawing.pdf.exe", pdf, pdf.length).ok, false);
});

test("empty and oversized files are refused before their content is read", () => {
  assert.equal(checkProductFile("DOCUMENT", "a.pdf", Buffer.alloc(0), 0).ok, false);
  assert.equal(checkProductFile("DRAWING_2D", "a.pdf", pdf, kindRule("DRAWING_2D").maxBytes + 1).ok, false);
});

test("documents follow the same PDF rules as drawings", () => {
  assert.equal(checkProductFile("DOCUMENT", "datasheet.pdf", pdf, pdf.length).ok, true);
  assert.equal(checkProductFile("DOCUMENT", "datasheet.glb", glb(20), 20).ok, false);
});
