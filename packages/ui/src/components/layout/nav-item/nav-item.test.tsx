import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NavAccessProvider } from "./nav-access-context";
import { NavItem } from "./nav-item";

describe("NavItem", () => {
  describe("without a NavAccessProvider", () => {
    it("renders every item, including ones that declare an ability (allow-all default)", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <NavItem
            label="Customers"
            to="/customers"
            ability={{ action: "manage", subject: "CUSTOMER" }}
            items={[
              { label: "Overview", to: "/customers/overview" },
              {
                label: "Suggestions",
                to: "/customers/suggestions",
                ability: { action: "read", subject: "CUSTOMER" },
              },
            ]}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Suggestions")).toBeInTheDocument();
    });
  });

  describe("with a NavAccessProvider that denies one child", () => {
    const can = (ability: { action: string; subject: string }) =>
      ability.subject !== "CUSTOMER";

    it("hides the denied child and shrinks the rail to the remaining child count", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/customers"]}>
          <NavAccessProvider can={can}>
            <NavItem
              label="Customers"
              to="/customers"
              items={[
                { label: "A", to: "/customers/a" },
                { label: "B", to: "/customers/b" },
                { label: "C", to: "/customers/c" },
                {
                  label: "D",
                  to: "/customers/d",
                  ability: { action: "read", subject: "CUSTOMER" },
                },
              ]}
            />
          </NavAccessProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();
      expect(screen.queryByText("D")).not.toBeInTheDocument();

      // 4 children minus the denied one leaves 3 -> (3 - 1) * 30 + 14 = 74
      const rail = container.querySelector('[aria-hidden="true"]');
      expect(rail).toHaveStyle({ height: "74px" });
    });
  });

  describe("with a NavAccessProvider that denies the top-level item's own ability", () => {
    it("hides the whole item, not just its children", () => {
      render(
        <MemoryRouter initialEntries={["/customers"]}>
          <NavAccessProvider can={() => false}>
            <NavItem
              label="Customers"
              to="/customers"
              ability={{ action: "manage", subject: "CUSTOMER" }}
            />
          </NavAccessProvider>
        </MemoryRouter>,
      );

      expect(screen.queryByText("Customers")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("explicit `end` vs the `items?.some(...)` heuristic", () => {
    it("does not mark the link active when `end` is explicitly true and the path doesn't match exactly", () => {
      render(
        <MemoryRouter initialEntries={["/customers/123"]}>
          <NavItem label="Customers" to="/customers" type="extension" end />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("link", { name: "Customers" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("keeps the old prefix-active heuristic when `end` is omitted and no item matches the pathname", () => {
      render(
        <MemoryRouter initialEntries={["/customers/123"]}>
          <NavItem label="Customers" to="/customers" type="extension" />
        </MemoryRouter>,
      );

      expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("resolves `end` to true via `items?.some(...)` when a child's `to` equals the pathname, turning the parent inactive", () => {
      render(
        <MemoryRouter initialEntries={["/customers/overview"]}>
          <NavItem
            label="Customers"
            to="/customers"
            type="extension"
            items={[{ label: "Overview", to: "/customers/overview" }]}
          />
        </MemoryRouter>,
      );

      // items?.some(i => i.to === pathname) is true, so end resolves to true;
      // "/customers" isn't an exact match for "/customers/overview" -> inactive.
      // (The item's presence also renders a duplicate mobile-only link with
      // the same name, so pick the first — the outer, desktop-visible one.)
      expect(
        screen.getAllByRole("link", { name: "Customers" })[0],
      ).not.toHaveAttribute("aria-current");
    });

    it("stays broadly prefix-active when no item's `to` equals the pathname", () => {
      render(
        <MemoryRouter initialEntries={["/customers/overview"]}>
          <NavItem
            label="Customers"
            to="/customers"
            type="extension"
            items={[{ label: "Other", to: "/customers/other" }]}
          />
        </MemoryRouter>,
      );

      expect(
        screen.getAllByRole("link", { name: "Customers" })[0],
      ).toHaveAttribute("aria-current", "page");
    });
  });

  describe("active state", () => {
    it("prefix-matches for type=core, excluding the root path", () => {
      render(
        <MemoryRouter initialEntries={["/users/123"]}>
          <NavItem label="Users" to="/users" type="core" />
          <NavItem label="Dashboard" to="/" type="core" />
        </MemoryRouter>,
      );

      expect(screen.getByRole("link", { name: "Users" }).className).toContain(
        "shadow-elevation-card-rest",
      );
      expect(
        screen.getByRole("link", { name: "Dashboard" }).className,
      ).not.toContain("shadow-elevation-card-rest");
    });

    it("prefix-matches for type=setting the same way", () => {
      render(
        <MemoryRouter initialEntries={["/settings/profile"]}>
          <NavItem label="Profile" to="/settings/profile" type="setting" />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("link", { name: "Profile" }).className,
      ).toContain("shadow-elevation-card-rest");
    });

    it("for type=extension, isActive respects `end`, unlike type=core's prefix override", () => {
      render(
        <MemoryRouter initialEntries={["/users/123"]}>
          <NavItem label="Users Ext" to="/users" type="extension" end />
          <NavItem label="Users Core" to="/users" type="core" end />
        </MemoryRouter>,
      );

      // extension: end=true and "/users/123" isn't an exact match -> not active
      expect(
        screen.getByRole("link", { name: "Users Ext" }).className,
      ).not.toContain("shadow-elevation-card-rest");
      // core: the prefix-match override ignores `end` entirely -> still active
      expect(
        screen.getByRole("link", { name: "Users Core" }).className,
      ).toContain("shadow-elevation-card-rest");
    });
  });
});
