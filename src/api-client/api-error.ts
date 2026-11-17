import type { ErrorCode } from "@/lib/errors";

export type ApiErrorCode = ErrorCode | "network_error" | "unexpected_response";

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly details: readonly FieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const KNOWN_CODES: readonly ApiErrorCode[] = [
  "validation_failed",
  "malformed_json",
  "not_found",
  "run_in_progress",
  "run_not_cancellable",
  "provider_failed",
  "internal_error",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readIssues(value: unknown): FieldIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((issue: unknown) =>
    isRecord(issue) && typeof issue.path === "string" && typeof issue.message === "string"
      ? [{ path: issue.path, message: issue.message }]
      : [],
  );
}

export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const error = isRecord(body) ? body.error : undefined;
  if (!isRecord(error) || typeof error.message !== "string") {
    return new ApiError("unexpected_response", status, `The server answered with status ${status}.`);
  }
  const code = KNOWN_CODES.find((known) => known === error.code) ?? "unexpected_response";
  return new ApiError(code, status, error.message, readIssues(error.details));
}

export type ErrorSubject = "config" | "run" | "lead";

const MISSING: Record<ErrorSubject, string> = {
  config: "This search config no longer exists. It may have been deleted in another tab.",
  run: "This search run no longer exists.",
  lead: "This lead no longer exists.",
};

export function describeApiError(error: unknown, subject: ErrorSubject = "config"): string {
  if (!(error instanceof ApiError)) return "Something unexpected happened in the app. Reload the page.";
  switch (error.code) {
    case "validation_failed":
      return "Some fields need attention. Check the messages next to them.";
    case "malformed_json":
      return "The server could not read what the app sent. Reload the page and try again.";
    case "not_found":
      return MISSING[subject];
    case "run_in_progress":
      return "A search for this config is already running. Wait for it to finish or cancel it first.";
    case "run_not_cancellable":
      return "This search had already finished, so there was nothing to cancel.";
    case "provider_failed":
      return "The lead source did not respond. Try the search again in a minute.";
    case "internal_error":
      return "The server hit an error it did not expect. Try again; if it repeats, check the server log.";
    case "network_error":
      return "Cannot reach the server. Check that the app is still running, then try again.";
    case "unexpected_response":
      return "The server sent a response the app did not understand. Reload the page.";
  }
}
