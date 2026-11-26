import "@/i18n";
import i18n from "@/i18n";
import { Form } from "@repo/ui/common-components";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  update: vi.fn(),
  handleSuccess: vi.fn(),
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));

vi.mock("@/hooks/api/marketing-sends", () => ({
  useMarketingSend: () => ({
    send: {
      id: "send-1",
      name: "Chào khách mới",
      mode: "AUTO",
      active: true,
      text: "Chào {name}",
    },
    isLoading: false,
    isError: false,
  }),
  useUpdateMarketingSend: () => ({
    mutateAsync: state.update,
    isPending: false,
  }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    useRouteModal: () => ({ handleSuccess: state.handleSuccess }),
    RouteDrawer: Object.assign(Pass, {
      Header: Pass,
      Title: Pass,
      Description: Pass,
      Body: Pass,
      Form: ({
        form,
        children,
      }: {
        form: UseFormReturn;
        children: ReactNode;
      }) => <Form {...form}>{children}</Form>,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { MarketingSendEdit } from "./marketing-send-edit";

const renderIt = () =>
  render(
    <TooltipProvider>
      <MemoryRouter>
        <MarketingSendEdit />
      </MemoryRouter>
    </TooltipProvider>,
  );

describe("MarketingSendEdit", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("vi");
  });

  beforeEach(() => {
    state.update.mockReset().mockResolvedValue({});
    state.handleSuccess.mockReset();
  });

  it("saves the new name with the text kept as placeholders", async () => {
    renderIt();

    fireEvent.change(screen.getByLabelText("Tên"), {
      target: { value: "Khách mới tháng 12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith({
        name: "Khách mới tháng 12",
        text: "Chào {name}",
      }),
    );
    expect(state.handleSuccess).toHaveBeenCalled();
  });

  it("won't save without a name", async () => {
    renderIt();

    fireEvent.change(screen.getByLabelText("Tên"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    // Schemas translate when they load, before the test switches to vi.
    expect(await screen.findByText("Enter a name")).toBeTruthy();
    expect(state.update).not.toHaveBeenCalled();
  });
});
