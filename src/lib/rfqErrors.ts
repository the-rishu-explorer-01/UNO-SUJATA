import { ApiError } from "@/lib/api";

export type ErrorKind = "network" | "upload" | "invalid-file" | "expired-file" | "validation" | "rate-limited" | "server";

export interface DescribedError {
  kind: ErrorKind;
  title: string;
  message: string;
  retryable: boolean;
}

/**
 * Turns any failure into a message a customer can act on.
 * Raw server text is shown only for 4xx responses, whose messages we wrote. 5xx responses never show their text.
 */
export function describeError(err: unknown, context: "upload" | "submit"): DescribedError {
  if (!(err instanceof ApiError) || err.status === 0 || err.code === "NETWORK") {
    return {
      kind: "network",
      title: "Connection problem",
      message: "We could not reach the server. Check your internet connection and try again. Your details are still here.",
      retryable: true,
    };
  }

  if (err.status === 429) {
    return { kind: "rate-limited", title: "Please wait a moment", message: err.message, retryable: false };
  }

  if (context === "upload") {
    if (err.status === 413 || err.status === 422) {
      return { kind: "invalid-file", title: "This file could not be added", message: err.message, retryable: false };
    }
    return {
      kind: "upload",
      title: "Upload did not finish",
      message: "The file did not upload. Try again, or remove it and add it once more.",
      retryable: true,
    };
  }

  // submit
  if (err.status === 422) {
    if (err.fields?.attachmentIds) {
      return {
        kind: "expired-file",
        title: "A file has expired",
        message: "One of your files was added too long ago. Remove it and upload it again.",
        retryable: false,
      };
    }
    return { kind: "validation", title: "Please check the form", message: "Some details need correcting. The highlighted fields explain what to change.", retryable: false };
  }
  if (err.status >= 400 && err.status < 500) {
    return { kind: "validation", title: "We could not process this", message: err.message, retryable: false };
  }
  return {
    kind: "server",
    title: "We could not confirm your request",
    message: "Something went wrong on our side, and we could not confirm your request was saved. Please try again in a moment. If it continues, email info@sujatabrass.com.",
    retryable: true,
  };
}
