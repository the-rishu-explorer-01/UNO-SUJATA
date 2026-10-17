import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { answerChat } from "../services/chat.service.js";
import { HttpError } from "../utils/http.js";

const body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(500) }))
    .min(1)
    .max(8),
});

export const chatController = {
  message: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = body.safeParse(req.body ?? {});
      if (!parsed.success) throw new HttpError(422, "Please write a shorter message and try again.");
      if (parsed.data.messages[parsed.data.messages.length - 1].role !== "user") {
        throw new HttpError(422, "The last message must be from the visitor.");
      }
      res.set("Cache-Control", "private, no-store");
      res.json(await answerChat(parsed.data.messages));
    } catch (err) {
      next(err);
    }
  },
};
