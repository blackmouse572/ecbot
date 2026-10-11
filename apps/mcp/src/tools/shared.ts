import * as z from "zod";

// Options spread into every @repo/client call: the caller's key, the API
// base URL, and the fetch settings workerd needs.
export interface ApiOptions {
  auth: string;
  baseURL: string;
  adapter: "fetch";
  fetchOptions: { cache: "no-store" };
}

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
  if (error) {
    const message =
      (error as { message?: unknown }).message ??
      "The Ecbot API request failed.";
    return {
      isError: true,
      content: [{ type: "text" as const, text: String(message) }],
    };
  }
  return {
    content: [{ type: "text" as const, text: JSON.stringify(pick(data as T)) }],
  };
}
