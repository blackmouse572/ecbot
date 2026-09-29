import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MembersNameCell } from "./member-name-cell";
import { MembersRoleCell } from "./member-role-cell";

describe("member cells", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the translated role name for the workspace owner, not the generated one", async () => {
    await i18n.changeLanguage("vi");
    render(
      <MembersRoleCell
        memberRole={{ name: "Owner - Bếp Nhà Mơ", type: "WORKSPACE_OWNER" }}
      />,
    );
    expect(screen.getByText("Chủ sở hữu")).toBeInTheDocument();
    expect(screen.queryByText(/Owner - /)).not.toBeInTheDocument();
  });

  it("keeps a custom role's own name", () => {
    render(
      <MembersRoleCell
        memberRole={{ name: "Sales", type: "WORKSPACE_MEMBER" }}
      />,
    );
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("translates the generated Member and Admin role names", async () => {
    await i18n.changeLanguage("vi");
    render(
      <>
        <MembersRoleCell
          memberRole={{ name: "Member", type: "WORKSPACE_MEMBER" }}
        />
        <MembersRoleCell
          memberRole={{ name: "Admin", type: "WORKSPACE_MEMBER" }}
        />
      </>,
    );
    expect(screen.getByText("Thành viên")).toBeInTheDocument();
    expect(screen.getByText("Quản trị viên")).toBeInTheDocument();
  });

  it("does not repeat the owner label next to the name (the role column shows it)", () => {
    render(
      <MembersNameCell
        member={
          {
            user: { name: "Lan" },
            role: { name: "Owner - x", type: "WORKSPACE_OWNER" },
          } as never
        }
      />,
    );
    expect(screen.queryByText("Workspace owner")).not.toBeInTheDocument();
  });

  it("keeps the role badge on one line", () => {
    render(
      <MembersRoleCell
        memberRole={{ name: "Owner - x", type: "WORKSPACE_OWNER" }}
      />,
    );
    expect(screen.getByText("Workspace owner").closest("span")).toHaveClass(
      "whitespace-nowrap",
    );
  });
});
