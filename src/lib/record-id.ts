import { z } from "zod";

export const recordIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Must be a record id of letters, digits, '-' or '_'");
