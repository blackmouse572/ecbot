import i18n from "@/i18n";
import { describe, expect, it } from "vitest";
import { CHATBOT_STATUS_CONFIG } from "./constants";

describe("CHATBOT_STATUS_CONFIG", () => {
  it("labels the inactive status as inactive", () => {
    expect(CHATBOT_STATUS_CONFIG.inactive.label).toBe(
      i18n.t("chatbot.list.columns.statusOptions.inactive"),
    );
  });
});
