import i18n from "@/i18n";
import type { RoleGetResponseDto } from "@repo/client";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleGeneralSection } from "./role-general-section";

const role = (over: Partial<RoleGetResponseDto>) =>
  ({
    id: "r1",
    name: "Manager",
    description: "Runs the workspace day to day.",
    type: "WORKSPACE_MEMBER",
    isActive: true,
    permissions: [],
    createdAt: "2026-11-22T00:00:00Z",
    updatedAt: "2026-11-22T00:00:00Z",
    ...over,
  }) as RoleGetResponseDto;

describe("role general section", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("heads a built-in role with its translated name and description", async () => {
    await i18n.changeLanguage("vi");
    render(<RoleGeneralSection role={role({})} />);
    expect(screen.getByText("Quản lý")).toBeInTheDocument();
    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Runs the workspace day to day."),
    ).not.toBeInTheDocument();
  });

  it("keeps a custom role's own name and description", () => {
    render(
      <RoleGeneralSection
        role={role({
          name: "Chăm sóc VIP",
          description: "Khách VIP",
          type: "USER",
        })}
      />,
    );
    expect(screen.getByText("Chăm sóc VIP")).toBeInTheDocument();
    expect(screen.getByText("Khách VIP")).toBeInTheDocument();
  });
});
