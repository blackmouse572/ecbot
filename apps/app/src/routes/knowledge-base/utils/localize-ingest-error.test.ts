import "@/i18n";
import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { localizeIngestError } from "./localize-ingest-error";

const NOT_PUBLIC =
  "This page is not publicly reachable. Use a link anyone can open on the internet, not localhost or a private network address.";

describe("localizeIngestError", () => {
  it("translates a known ingest error", async () => {
    await i18n.changeLanguage("vi");
    expect(localizeIngestError(NOT_PUBLIC, i18n.t)).toContain("công khai");
  });

  it("keeps an unknown error as stored", () => {
    expect(localizeIngestError("Something else", i18n.t)).toBe(
      "Something else",
    );
  });
});
