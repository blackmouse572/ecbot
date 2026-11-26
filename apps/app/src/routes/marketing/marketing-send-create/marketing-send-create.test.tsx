import "@/i18n";
import i18n from "@/i18n";
import { Form } from "@repo/ui/common-components";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const draft = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const customersQuery = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));

vi.mock("@/hooks/api/marketing-sends", () => ({
  useMarketingAudiencePreview: () => ({
    preview: {
      count: 48,
      excluded: {
        total: 6,
        reasons: [
          { reason: "STOPPED", count: 4 },
          { reason: "PAUSED", count: 2 },
          { reason: "CAPPED", count: 0 },
        ],
      },
      channels: [{ platform: "FACEBOOK_PAGE", count: 30 }],
    },
    isLoading: false,
    isError: false,
  }),
  useMarketingAudienceCustomers: (_ws: string, body: unknown) => {
    customersQuery(body);

    return {
      customers: [
        { id: "c1", name: "Lan Phạm", conversationCount: 1, channels: [] },
        { id: "c2", name: "Minh Trần", conversationCount: 1, channels: [] },
      ],
      count: 2,
      isLoading: false,
      isError: false,
    };
  },
  useDraftMarketingSend: () => ({ mutateAsync: draft, isPending: false }),
  useCreateMarketingSend: () => ({ mutateAsync: create, isPending: false }),
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

import { StackedModalProvider } from "@/components/modals/stacked-modal-provider";
import { MarketingSendCreate } from "./marketing-send-create";

// The AI draft lands in the editor, {name} as its chip.
const drafted = () =>
  waitFor(() =>
    expect(screen.getByTestId("send-editor").textContent).toContain(
      "Tên khách",
    ),
  );

// The { } menu adds a placeholder chip where the cursor is.
const insertChip = async (label: string) => {
  fireEvent.keyDown(
    screen.getByRole("button", { name: "Chèn tên khách hoặc sản phẩm" }),
    { key: "Enter" },
  );
  fireEvent.click(await screen.findByRole("menuitem", { name: label }));
};

const renderAt = (preset: string) =>
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[`/lumi/marketing/send/${preset}`]}>
        <Routes>
          <Route
            path="/:workspaceSlug/marketing/send/:preset"
            element={
              <StackedModalProvider onOpenChange={() => {}}>
                <MarketingSendCreate />
              </StackedModalProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );

describe("MarketingSendCreate", () => {
  beforeAll(async () => {
    // The customers table scrolls to its top on a page change; jsdom can't.
    Element.prototype.scroll = vi.fn();
    await i18n.changeLanguage("vi");
  });

  beforeEach(() => {
    draft.mockReset();
    create.mockReset();
    draft.mockResolvedValue({
      text: "Chào {name}, {product} bạn hỏi vẫn còn hàng nha.",
    });
    create.mockResolvedValue({ id: "s1" });
  });

  it("drafts the text on open and shows who it reaches", async () => {
    renderAt("ASKED_PRICE");

    expect(screen.getByTestId("send-audience-count").textContent).toContain(
      "48",
    );
    expect(
      screen.getByText(
        /Ecbot đã bỏ 6 khách: 4 đã dừng nhận tin, 2 đang tạm ngưng/,
      ),
    ).toBeTruthy();
    await drafted();
    expect(draft).toHaveBeenCalledWith(
      expect.objectContaining({ preset: "ASKED_PRICE", tone: "FRIENDLY" }),
    );
    expect(draft.mock.calls[0][0]).not.toHaveProperty("previous");
  });

  it("shows not found for a name off the object prototype", () => {
    renderAt("toString");

    expect(
      screen.getByRole("heading", { name: "Không có việc này" }),
    ).toBeTruthy();
    expect(draft).not.toHaveBeenCalled();
  });

  it("rewrites the current text longer", async () => {
    renderAt("ASKED_PRICE");
    await drafted();

    fireEvent.click(screen.getByRole("button", { name: "Dài hơn" }));

    await waitFor(() => expect(draft).toHaveBeenCalledTimes(2));
    expect(draft.mock.calls[1][0]).toMatchObject({
      previous: "Chào {name}, {product} bạn hỏi vẫn còn hàng nha.",
      rewrite: "LONGER",
    });
  });

  it("rewrites in the tone picked under Viết lại, the current one too", async () => {
    renderAt("ASKED_PRICE");
    await drafted();

    const pick = async (tone: string) => {
      fireEvent.keyDown(screen.getByRole("button", { name: "Viết lại" }), {
        key: "Enter",
      });
      fireEvent.click(await screen.findByRole("menuitemradio", { name: tone }));
    };

    await pick("Lịch sự");
    await waitFor(() => expect(draft).toHaveBeenCalledTimes(2));
    expect(draft.mock.calls[1][0]).toMatchObject({
      tone: "POLITE",
      rewrite: "DIFFERENT",
    });

    await pick("Lịch sự");
    await waitFor(() => expect(draft).toHaveBeenCalledTimes(3));
    expect(draft.mock.calls[2][0]).toMatchObject({ tone: "POLITE" });
  });

  it("sends the stage with the text and turns on daily sending", async () => {
    renderAt("ASKED_PRICE");
    await drafted();

    fireEvent.click(screen.getByRole("button", { name: "Gửi và bật tự gửi" }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({
      preset: "ASKED_PRICE",
      name: "Nhắc khách hỏi giá chưa mua",
      mode: "AUTO",
      text: "Chào {name}, {product} bạn hỏi vẫn còn hàng nha.",
      excludedCustomerIds: [],
    });
  });

  it("adds the product chip to the text it sends", async () => {
    renderAt("ASKED_PRICE");
    await drafted();

    await insertChip("{Sản phẩm}");
    fireEvent.click(screen.getByRole("button", { name: "Gửi và bật tự gửi" }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].text.match(/\{product\}/g)).toHaveLength(2);
  });

  it("lists a channel's customers and leaves out who the shop unticks", async () => {
    renderAt("ASKED_PRICE");
    await drafted();

    fireEvent.click(screen.getByRole("button", { name: /Facebook/ }));

    expect(await screen.findByText("Khách sẽ nhận tin")).toBeTruthy();
    expect(customersQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: "ASKED_PRICE",
        platform: "FACEBOOK_PAGE",
      }),
    );
    const [, lan] = screen.getAllByRole("checkbox");
    expect(lan.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(lan);
    expect(await screen.findByText("Đã bỏ chọn 1 khách")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xong" }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi và bật tự gửi" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ excludedCustomerIds: ["c1"] }),
      ),
    );
  });

  it("lets the shop write the text when the AI cannot", async () => {
    draft.mockRejectedValue(new Error("down"));
    renderAt("ASKED_PRICE");

    // jsdom can't type into the editor, so the shop adds a chip instead.
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Chèn tên khách hoặc sản phẩm" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    await insertChip("{Tên khách}");
    fireEvent.click(screen.getByRole("button", { name: "Gửi và bật tự gửi" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ text: "{name}" }),
      ),
    );
  });

  it("says the stage is unknown instead of drafting for it", () => {
    renderAt("VIP");

    expect(screen.getAllByText("Không có việc này").length).toBeGreaterThan(0);
    expect(draft).not.toHaveBeenCalled();
  });
});
