import "@/i18n";
import i18n from "@/i18n";
import { Form } from "@repo/ui/common-components";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.hoisted(() => vi.fn());
const settings = {
  maxPer30Days: 3,
  maxPerDay: 1,
  restAfter: 3,
  restDays: 30,
  sendFrom: "09:00",
  sendTo: "20:00",
  stopKeywords: ["dừng", "stop"],
  stopReply: null,
  stopReplyEnabled: true,
};

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));

vi.mock("@/hooks/api/marketing-settings", () => ({
  useMarketingSettings: () => ({
    settings,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useUpdateMarketingSettings: () => ({
    mutateAsync: update,
    isPending: false,
  }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
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

import { MarketingSettings } from "./marketing-settings";

const renderIt = () =>
  render(
    <TooltipProvider>
      <MemoryRouter>
        <MarketingSettings />
      </MemoryRouter>
    </TooltipProvider>,
  );

describe("MarketingSettings", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("vi");
  });

  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue(settings);
  });

  it("saves an empty confirmation as the built-in one", async () => {
    renderIt();

    fireEvent.change(screen.getByLabelText("Số ngày nghỉ"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      sendFrom: "09:00",
      sendTo: "20:00",
      maxPer30Days: 3,
      restAfter: 3,
      restDays: 14,
      stopKeywords: ["dừng", "stop"],
      stopReplyEnabled: true,
      stopReply: null,
    });
  });

  it("keeps the confirmation text the shop writes", async () => {
    renderIt();

    fireEvent.change(screen.getByLabelText("Lời xác nhận"), {
      target: { value: "Dạ shop ngưng gửi ưu đãi ạ." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ stopReply: "Dạ shop ngưng gửi ưu đãi ạ." }),
      ),
    );
  });

  it("does not save an empty number", async () => {
    renderIt();

    fireEvent.change(screen.getByLabelText("Số tin trong 30 ngày"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    // Schema messages are read when the module loads, in its language then.
    expect(
      await screen.findByText(
        /Nhập một số từ 1 trở lên|Enter a number from 1 up/,
      ),
    ).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });
});
