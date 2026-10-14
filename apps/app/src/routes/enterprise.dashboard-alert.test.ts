import { describe, expect, it } from "vitest";
import { enterpriseDashboardAlerts } from "./enterprise.dashboard-alert";

// Deliberately does NOT assert an empty array: in the enterprise tree the
// overlay is materialised and the glob matches, so `[]` would fail there.
describe("enterpriseDashboardAlerts", () => {
  it("returns components whether or not the overlay is materialised", () => {
    const alerts = enterpriseDashboardAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    for (const alert of alerts) {
      expect(["function", "object"]).toContain(typeof alert);
    }
  });

  it("returns the same array reference on every call", () => {
    const first = enterpriseDashboardAlerts();
    expect(enterpriseDashboardAlerts()).toBe(first);
  });
});
