import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCoreRoutes } from "./use-core-routes";
import { useMarketingRoutes } from "./use-marketing-routes";

vi.mock("@/hooks/api/feature-flags", () => ({
  useFeatureFlags: () => ({
    flags: { orders: true, customerSources: true, marketing: true },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/hooks/api/workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "lumi" } }),
}));

type NavItem = {
  to: string;
  ability?: { action: string; subject: string };
  items?: NavItem[];
};
const flatten = (items: NavItem[]): NavItem[] =>
  items.flatMap((item) => [item, ...flatten(item.items ?? [])]);
const abilityOf = (items: NavItem[], to: string) =>
  flatten(items).find((item) => item.to === to)?.ability;

// The built-in Marketing and Developer roles only view conversations and
// customers, and Sales has no marketing, so each entry asks for read on the
// area's own permission.
describe("nav abilities", () => {
  const core = () => renderHook(useCoreRoutes).result.current as NavItem[];
  const marketing = () =>
    renderHook(useMarketingRoutes).result.current as NavItem[];

  it.each([
    ["/lumi/conversations", "CONVERSATION"],
    ["/lumi/followups", "CONVERSATION"],
    ["/lumi/orders", "ORDER"],
    ["/lumi/customers", "CUSTOMER"],
  ])("%s needs read %s", (to, subject) => {
    expect(abilityOf(core(), to)).toEqual({ action: "read", subject });
  });

  it.each(["/lumi/marketing", "/lumi/sources"])(
    "%s needs read MARKETING",
    (to) => {
      expect(abilityOf(marketing(), to)).toEqual({
        action: "read",
        subject: "MARKETING",
      });
    },
  );
});
