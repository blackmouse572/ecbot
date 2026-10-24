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

  it("translates the out-of-tokens error apps/api stores", async () => {
    await i18n.changeLanguage("vi");
    expect(
      localizeIngestError(
        "Your workspace has no AI tokens left. Top up or renew your plan, then process this item again.",
        i18n.t,
      ),
    ).toContain("hết token");
  });

  it("translates the storage-full error apps/api stores", async () => {
    await i18n.changeLanguage("vi");
    expect(
      localizeIngestError(
        "This website has more text than your plan's knowledge storage has room for. Delete some knowledge or upgrade your plan, then process it again.",
        i18n.t,
      ),
    ).toContain("dung lượng kiến thức");
  });

  it("keeps an unknown error as stored", () => {
    expect(localizeIngestError("Something else", i18n.t)).toBe(
      "Something else",
    );
  });
});
