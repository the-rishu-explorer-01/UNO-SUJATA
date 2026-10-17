import multer from "multer";
import { MAX_FILE_BYTES } from "../lib/files.js";

/**
 * Accepts one file per request, in memory, with hard size and field limits.
 * Files are checked against their bytes in the service layer before anything touches disk.
 */
export const singleDrawing = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 0, parts: 2 },
}).single("file");

/** Product image: one file plus the `alt` text field. Text parts are capped so a request cannot carry large payloads. */
export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 500, parts: 4 },
}).single("image");

/** Public PDF document (catalogue, brochure). One file per request, bounded to the document limit. */
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
}).single("file");

/** Drawing, 3D model or document: one file plus three short text fields (kind, label, isPublic). */
export const productFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 3, fieldSize: 200, parts: 5 },
}).single("file");
