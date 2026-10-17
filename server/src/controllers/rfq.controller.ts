import type { NextFunction, Request, Response } from "express";
import { rfqSubmissionSchema } from "../lib/rfqSchema.js";
import { isRfqNumber } from "../lib/rfqNumber.js";
import { HttpError } from "../utils/http.js";
import { createEmailProvider } from "../services/email/index.js";
import { discardUpload, getPublicRfq, stageUpload, submitRfq } from "../services/rfq.service.js";

// One provider per process. Built lazily so a missing SMTP setting fails on first use, not on import.
let provider: ReturnType<typeof createEmailProvider> | null = null;
const emailProvider = () => (provider ??= createEmailProvider());

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,64}$/;

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const rfqController = {
  /** POST /api/rfq/uploads: stage one drawing. */
  stageUpload: wrap(async (req, res) => {
    if (!req.file) throw new HttpError(422, "Choose a file to upload.");
    const file = await stageUpload(req.file);
    res.status(201).json(file);
  }),

  /** DELETE /api/rfq/uploads/:id: remove a staged drawing the customer no longer wants. */
  discardUpload: wrap(async (req, res) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(404, "File not found");
    await discardUpload(id);
    res.status(204).end();
  }),

  /** POST /api/rfq: submit a requirement. */
  submit: wrap(async (req, res) => {
    const parsed = rfqSubmissionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new HttpError(422, "Please check the highlighted fields.", parsed.error.flatten().fieldErrors);
    }
    const keyHeader = req.header("Idempotency-Key");
    if (keyHeader !== undefined && !IDEMPOTENCY_KEY.test(keyHeader)) {
      throw new HttpError(400, "The request could not be processed. Please try again.");
    }

    const result = await submitRfq(parsed.data, keyHeader, emailProvider());
    res.status(result.accessToken ? 201 : 200).json({
      rfqNumber: result.rfqNumber,
      status: result.status,
      submittedAt: result.createdAt,
      // Shown once. Needed to check status later. Never returned again.
      accessToken: result.accessToken ?? null,
    });
  }),

  /** GET /api/rfq/:rfqNumber: customer-safe status. Requires X-RFQ-Token. */
  lookup: wrap(async (req, res) => {
    const rfqNumber = String(req.params.rfqNumber);
    const token = req.header("X-RFQ-Token") ?? "";
    if (!isRfqNumber(rfqNumber) || token.length < 20 || token.length > 100) {
      throw new HttpError(404, "We could not find that request. Check the reference and try again.");
    }
    res.json(await getPublicRfq(rfqNumber, token));
  }),
};
