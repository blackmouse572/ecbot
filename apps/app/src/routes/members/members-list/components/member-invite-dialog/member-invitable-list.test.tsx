import { Toaster } from "@medusajs/ui";
import { Command, CommandList } from "@repo/ui/components";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async () => {
  const actual =
    await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "en" },
    }),
  };
});

const { inviteUser } = vi.hoisted(() => ({
  inviteUser: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useInvitableUsers: () => ({
    users: [{ id: "u-1", name: "Lan", email: "lan@example.com" }],
    isLoading: false,
    isFetching: false,
  }),
  useInviteUser: () => ({ mutateAsync: inviteUser }),
}));

import { MemberInvitableList } from "./member-invitable-list";

// cmdk scrolls the selected item into view; jsdom has no layout.
Element.prototype.scrollIntoView = vi.fn();

const renderList = () =>
  render(
    <>
      <Toaster />
      <Command shouldFilter={false}>
        <CommandList>
          <MemberInvitableList enabled />
        </CommandList>
      </Command>
    </>,
  );

describe("MemberInvitableList", () => {
  it("shows the API's error in a toast when the invite fails", async () => {
    inviteUser.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 500"), {
        response: {
          status: 500,
          data: { statusCode: 500, message: "Could not send the invite" },
        },
      }),
    );
    renderList();

    fireEvent.click(screen.getByRole("button"));

    expect(
      await screen.findByText("Could not send the invite"),
    ).toBeInTheDocument();
  });

  it("falls back to the generic error when the API sends no message", async () => {
    inviteUser.mockRejectedValue(new Error("Network Error"));
    renderList();

    fireEvent.click(screen.getByRole("button"));

    expect(
      await screen.findByText("errorBoundary.internalServerErrorMessage"),
    ).toBeInTheDocument();
  });
});
