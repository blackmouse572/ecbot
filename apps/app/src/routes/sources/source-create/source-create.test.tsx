import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  created: new Array<unknown>(),
  handleSuccess: vi.fn(),
  accounts: [
    { id: "acc-page", name: "Lumi Skincare", type: "FACEBOOK_PAGE" },
    { id: "acc-site", name: "lumi.vn", type: "WEBSITE_WIDGET" },
    { id: "acc-zalo", name: "Lumi OA", type: "ZALO_PAGE" },
    { id: "acc-api", name: "POS", type: "API_CHANNEL" },
  ],
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");

  return { ...actual, toast };
});

vi.mock("@/hooks/api/accounts", () => ({
  useAccounts: () => ({ accounts: api.accounts }),
}));

vi.mock("@/hooks/api/tracked-links", () => ({
  useCreateTrackedLink: () => ({
    mutateAsync: async (body: { name: string }) => {
      api.created.push(body);

      return {
        id: "tl-1",
        name: body.name,
        code: "to-roi-tet",
        kind: "LINK",
        status: "ACTIVE",
        url: "https://m.me/1234?ref=to-roi-tet",
        tagIds: [],
        promisesOffer: false,
        account: {
          id: "acc-page",
          name: "Lumi Skincare",
          type: "FACEBOOK_PAGE",
        },
        createdAt: "2026-11-10T00:00:00Z",
      };
    },
    isPending: false,
  }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    useRouteModal: () => ({ handleSuccess: api.handleSuccess }),
    RouteFocusModal: Object.assign(Pass, {
      Form: ({
        form,
        children,
      }: {
        form: UseFormReturn;
        children: ReactNode;
      }) => <Form {...form}>{children}</Form>,
      Header: Pass,
      Title: Pass,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { SourceCreate } from "./source-create";

const renderCreate = () =>
  render(
    <MemoryRouter initialEntries={["/ws/sources/create"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/sources/create"
          element={<SourceCreate />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("SourceCreate", () => {
  beforeEach(() => {
    api.created = [];
    api.handleSuccess.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("offers only channels a link can open, with Zalo OA coming soon", () => {
    renderCreate();

    expect(screen.getByRole("radio", { name: /Lumi Skincare/ })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getByRole("radio", { name: /lumi\.vn/ })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getByRole("radio", { name: /Lumi OA/ })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.queryByRole("radio", { name: /POS/ })).toBeNull();
  });

  it("creates the link, then shows it with its QR on the share step", async () => {
    const { container } = renderCreate();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Tờ rơi Tết" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Lumi Skincare/ }));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText("m.me/1234?ref=to-roi-tet")).toBeTruthy(),
    );
    expect(api.created).toEqual([
      { name: "Tờ rơi Tết", accountId: "acc-page", targetUrl: undefined },
    ]);
    expect(toast.success).toHaveBeenCalledWith("Tracked link created");
    expect(
      screen.getByRole("img", { name: "QR code for Tờ rơi Tết" }),
    ).toBeTruthy();

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(api.handleSuccess).toHaveBeenCalledWith("/ws/sources/tl-1"),
    );
  });

  it("asks for the website page when the website chat is picked", async () => {
    const { container } = renderCreate();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Trang kem chống nắng" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /lumi\.vn/ }));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(
        screen.getByText("Enter the full page address, starting with https://"),
      ).toBeTruthy(),
    );
    expect(api.created).toEqual([]);
  });
});
