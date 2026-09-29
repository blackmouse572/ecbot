import { describe, expect, it } from "vitest";
import { readApiError } from "./api-error";

// The shape axios rejects with when the client runs with throwOnError.
const axios422 = (data: unknown) =>
  Object.assign(new Error("Request failed with status code 422"), {
    isAxiosError: true,
    response: { status: 422, data },
  });

describe("readApiError", () => {
  it("reads the API message and per-field errors, not the axios message", () => {
    const error = axios422({
      statusCode: 5030,
      message: "Validation error",
      errors: [
        { property: "email", message: "Email contains invalid characters" },
        { property: "email", message: "Email is too long" },
        { property: "name", message: "Name is required" },
      ],
    });

    expect(readApiError(error)).toEqual({
      status: 422,
      message: "Validation error",
      fields: {
        email: "Email contains invalid characters",
        name: "Name is required",
      },
    });
  });

  it("returns no message or fields for an error without an API body", () => {
    expect(readApiError(new Error("Network Error"))).toEqual({
      status: undefined,
      message: undefined,
      fields: {},
    });
    expect(readApiError(undefined)).toEqual({
      status: undefined,
      message: undefined,
      fields: {},
    });
  });
});
