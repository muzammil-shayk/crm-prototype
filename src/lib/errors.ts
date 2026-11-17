type ConflictCode = "run_in_progress" | "run_not_cancellable";

export type ErrorCode =
  "validation_failed" | "malformed_json" | "not_found" | ConflictCode | "provider_failed" | "internal_error";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class MalformedJsonError extends AppError {
  constructor() {
    super("malformed_json", 400, "The request body is not valid JSON.");
  }
}

export class BodyTooLargeError extends AppError {
  constructor(limitLabel: string) {
    super("validation_failed", 413, `The request body is larger than ${limitLabel}.`);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("not_found", 404, `${resource} ${id} was not found.`);
  }
}

export class ConflictError extends AppError {
  constructor(code: ConflictCode, message: string) {
    super(code, 409, message);
  }
}

export class ProviderError extends AppError {
  constructor(provider: "search" | "llm", reason: string) {
    super("provider_failed", 502, `The ${provider} provider failed: ${reason}`);
  }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
