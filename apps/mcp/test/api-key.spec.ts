import { describe, expect, it } from "vitest";
import { readApiKey } from "../src/api-key";

describe("readApiKey", () => {
  it("reads the x-api-key header", () => {
    expect(readApiKey(new Headers({ "x-api-key": "key:secret" }))).toBe(
      "key:secret",
    );
  });

  it("reads an Authorization bearer token", () => {
    expect(
      readApiKey(new Headers({ authorization: "Bearer key:secret" })),
    ).toBe("key:secret");
    expect(
      readApiKey(new Headers({ authorization: "bearer key:secret" })),
    ).toBe("key:secret");
  });

  it("prefers x-api-key when both are sent", () => {
    expect(
      readApiKey(
        new Headers({ "x-api-key": "header:key", authorization: "Bearer b:k" }),
      ),
    ).toBe("header:key");
  });

  it("returns null when no key is sent", () => {
    expect(readApiKey(new Headers())).toBeNull();
    expect(readApiKey(new Headers({ authorization: "Basic abc" }))).toBeNull();
    expect(readApiKey(new Headers({ authorization: "Bearer " }))).toBeNull();
  });
});
