import { describe, expect, it } from "vitest";
import { enterprisePageAlerts } from "./enterprise.page-alert";

// Like the dashboard alerts: no empty-array assertion, since the enterprise
// tree materialises the overlay and the glob matches there.
describe("enterprisePageAlerts", () => {
  it.each(["members", "customers"] as const)(
    "returns components for %s whether or not the overlay is materialised",
    (page) => {
      const alerts = enterprisePageAlerts(page);
      expect(Array.isArray(alerts)).toBe(true);
      for (const alert of alerts) {
        expect(["function", "object"]).toContain(typeof alert);
      }
    },
  );

  it("returns the same array reference on every call", () => {
    const first = enterprisePageAlerts("members");
    expect(enterprisePageAlerts("members")).toBe(first);
  });
});
