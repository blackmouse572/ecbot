import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async () => {
  const actual =
    await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});

import { ProfileGeneralSection } from "./profile-general-section";

const renderSection = (user: object) =>
  render(
    <MemoryRouter>
      <ProfileGeneralSection
        user={
          {
            email: "chu@shop.vn",
            status: "active",
            signUpDate: "2026-01-01",
            country: { name: "Việt Nam" },
            ...user,
          } as never
        }
      />
    </MemoryRouter>,
  );

describe("ProfileGeneralSection", () => {
  it("shows the username in parentheses after the name", () => {
    renderSection({ name: "Nguyễn Văn Chủ", username: "chu" });

    expect(screen.getByText("Nguyễn Văn Chủ (chu)")).toBeInTheDocument();
  });

  it("drops the empty parentheses when there is no username", () => {
    renderSection({ name: "Nguyễn Văn Chủ", username: "" });

    expect(screen.getByText("Nguyễn Văn Chủ")).toBeInTheDocument();
  });
});
