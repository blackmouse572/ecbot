import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api", () => ({ useUser: () => ({ user: undefined }) }));

import { UserLink } from "./user-link";

const renderLink = (props: Parameters<typeof UserLink>[0]) =>
  render(
    <MemoryRouter>
      <UserLink {...props} />
    </MemoryRouter>,
  );

describe("UserLink", () => {
  it("shows the user's name rather than their email", () => {
    renderLink({ id: "u1", name: "Lan Nguyen", email: "lan@shop.vn" });

    expect(screen.getByText("Lan Nguyen")).toBeInTheDocument();
    expect(screen.queryByText("lan@shop.vn")).toBeNull();
  });

  it("falls back to the email when there is no name", () => {
    renderLink({ id: "u1", name: "", email: "lan@shop.vn" });

    expect(screen.getByText("lan@shop.vn")).toBeInTheDocument();
  });
});
