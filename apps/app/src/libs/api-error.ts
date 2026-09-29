import type { ApiErrorBody, ApiErrorDetails } from "@/types/api-error";

/**
 * Read the API error body out of a failed `@repo/client` call. The client
 * runs with `throwOnError`, so it rejects with the axios error and the body
 * (`{ message, errors: [{ property, message }] }`) sits on `response.data`;
 * the axios message itself ("Request failed with status code 422") is never
 * meant for people.
 */
export function readApiError(error: unknown): ApiErrorDetails {
  const response = (
    error as { response?: { status?: number; data?: ApiErrorBody } } | undefined
  )?.response;
  const body = response?.data;

  const fields: Record<string, string> = {};
  for (const item of body?.errors ?? []) {
    if (
      typeof item.property === "string" &&
      typeof item.message === "string" &&
      !(item.property in fields)
    ) {
      fields[item.property] = item.message;
    }
  }

  return {
    status: response?.status,
    message: typeof body?.message === "string" ? body.message : undefined,
    fields,
  };
}
