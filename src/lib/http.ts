import { z, ZodError, type core } from "zod";
import { AppError, BodyTooLargeError, MalformedJsonError } from "./errors";
import { recordIdSchema } from "./record-id";

interface FieldIssue {
  path: string;
  message: string;
}

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_BODY_LABEL = "1 MB";

function errorBody(code: string, message: string, details?: FieldIssue[]) {
  return { error: details ? { code, message, details } : { code, message } };
}

function fieldIssues(issue: core.$ZodIssue): FieldIssue[] {
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({ path: [...issue.path, key].join("."), message: "Unknown field" }));
  }
  return [{ path: issue.path.join("."), message: issue.message }];
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    const details = error.issues.flatMap(fieldIssues);
    const noun = details.length === 1 ? "field" : "fields";
    const message = `The request has ${details.length} invalid ${noun}.`;
    return Response.json(errorBody("validation_failed", message, details), { status: 400 });
  }
  if (error instanceof AppError) {
    return Response.json(errorBody(error.code, error.message), { status: error.status });
  }
  console.error(error);
  return Response.json(errorBody("internal_error", "Something went wrong on our side."), { status: 500 });
}

async function readCappedText(request: Request): Promise<string> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    throw new BodyTooLargeError(MAX_BODY_LABEL);
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    received += chunk.value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new BodyTooLargeError(MAX_BODY_LABEL);
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await readCappedText(request);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MalformedJsonError();
  }
}

export interface IdContext {
  params: Promise<{ id: string }>;
}

const idParamsSchema = z.object({ id: recordIdSchema });

export async function readId(context: IdContext): Promise<string> {
  return idParamsSchema.parse(await context.params).id;
}

export function readQuery(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

export function apiRoute<Context>(run: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    try {
      return await run(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
