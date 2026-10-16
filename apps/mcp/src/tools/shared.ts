import type { RolePermissionDto } from "@repo/client";
import * as z from "zod";

// Options spread into every @repo/client call: the caller's key, the API
// base URL, and the fetch settings workerd needs.
export interface ApiOptions {
  auth: string;
  baseURL: string;
  adapter: "fetch";
  fetchOptions: { cache: "no-store" };
}

// Whether the key may take an action, as the API route behind a tool checks
// it. Tools the key may not use stay off the list the agent sees.
export type Allows = (
  subject: RolePermissionDto["subject"],
  action: RolePermissionDto["action"][number],
) => boolean;

// Tool annotations by the kind of change a tool makes. A tool that only
// adds, or flips a reversible switch, is not destructive; one that
// overwrites or deletes is.
export const READS = { readOnlyHint: true };
export const ADDS = { readOnlyHint: false, destructiveHint: false };
export const SWITCHES = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
};
export const OVERWRITES = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
};
export const DELETES = { readOnlyHint: false, destructiveHint: true };

export const paging = {
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
};

// Turns a @repo/client result into a tool result. apps/api errors carry a
// localized `message`; pass it on so the agent can tell the user.
export async function respond<T>(
  call: Promise<{ data?: T; error?: unknown }>,
  pick: (data: T) => unknown,
) {
  const { data, error } = await call;
  if (error) return apiError(error);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(pick(data as T)) }],
  };
}

export function apiError(error: unknown) {
  const message =
    (error as { message?: unknown } | undefined)?.message ??
    "The Ecbot API request failed.";
  return fail(String(message));
}

export function fail(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}
