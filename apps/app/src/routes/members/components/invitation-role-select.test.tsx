import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../hooks/use-invitable-roles", () => ({
  useInvitableRoles: () => ({
    roles: [
      {
        id: "r-sales",
        name: "Sales",
        type: "WORKSPACE_MEMBER",
        isActive: true,
      },
      { id: "r-vip", name: "Chăm sóc VIP", type: "USER", isActive: true },
    ],
  }),
}));

import { InvitationRoleSelect } from "./invitation-role-select";

describe("InvitationRoleSelect", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("names built-in roles in the user's language", async () => {
    await i18n.changeLanguage("vi");
    const { rerender } = render(
      <InvitationRoleSelect value="r-sales" onValueChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Bán hàng");

    rerender(<InvitationRoleSelect value="r-vip" onValueChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Chăm sóc VIP");
  });
});
