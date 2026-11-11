import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  previewChunks: new Array<unknown>(),
  imported: new Array<unknown>(),
  /** Import calls, each with the chunks it sent. */
  calls: new Array<unknown[][]>(),
  /** Fail the next import after this many chunks went through. */
  failAfter: null as number | null,
  onDone: vi.fn(),
}));

const result = (orders: number) => ({
  dryRun: true,
  orders,
  skipped: 0,
  newCustomers: 1,
  newGroups: [],
  invalidRows: [{ row: 2, reason: "missingPhone" }],
});

vi.mock("@/hooks/api/orders", () => ({
  useOrderImportPreview: (_workspace: string, chunks: unknown[][]) => {
    api.previewChunks = chunks;

    return { data: chunks.length ? [result(1)] : undefined };
  },
  useImportOrders: () => ({
    mutateAsync: async ({
      chunks,
      onChunk,
    }: {
      chunks: unknown[][];
      onChunk: (r: ReturnType<typeof result>) => void;
    }) => {
      api.imported = chunks;
      api.calls.push(chunks);

      for (const [index] of chunks.entries()) {
        if (api.failAfter === index) {
          api.failAfter = null;
          throw new Error("network");
        }

        onChunk(result(1));
      }
    },
    isPending: false,
  }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    RouteFocusModal: Object.assign(Pass, {
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { ImportMapStep } from "./import-map-step";

const file = {
  name: "don.csv",
  headers: ["Ma don", "SDT", "San pham"],
  records: [
    ["SP-1", "0903412885", "Kem"],
    ["SP-2", "", "Serum"],
  ],
};

const renderStep = (current = file) =>
  render(
    <MemoryRouter initialEntries={["/ws/orders/import"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/orders/import"
          element={
            <ImportMapStep
              file={current}
              onBack={vi.fn()}
              onDone={api.onDone}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ImportMapStep", () => {
  beforeEach(() => {
    api.onDone.mockReset();
    api.calls = [];
    api.failAfter = null;
  });

  it("previews the guessed mapping, then imports the same rows", async () => {
    renderStep();

    expect(api.previewChunks).toEqual([
      [
        { code: "SP-1", phone: "0903412885", item: "Kem" },
        { code: "SP-2", item: "Serum" },
      ],
    ]);
    expect(screen.getByText(/1 row missing a phone number/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Import 1 order" }));

    await waitFor(() => expect(api.onDone).toHaveBeenCalled());
    expect(api.imported).toEqual(api.previewChunks);
    expect(api.onDone.mock.calls[0][0].invalidLines).toEqual([
      { line: 3, reason: "missingPhone" },
    ]);
  });

  it("lists the cancelled rows when nothing else is left to import", () => {
    renderStep({
      name: "huy.csv",
      headers: ["Ma don", "SDT", "San pham", "Trang thai"],
      records: [["SP-1", "0903412885", "Kem", "Đã huỷ"]],
    });

    expect(api.previewChunks).toEqual([]);
    expect(screen.getByText(/1 row of cancelled orders/)).toBeTruthy();
    expect(screen.queryByLabelText("Checking the file")).toBeNull();
  });

  it("sends only the chunks left when the shop retries a failed import", async () => {
    // 201 customers: one request holds 200 rows, so this file takes two.
    const big = {
      name: "lon.csv",
      headers: ["SDT", "San pham"],
      records: Array.from({ length: 201 }, (_, index) => [
        `09000${String(index).padStart(5, "0")}`,
        "Kem",
      ]),
    };

    api.failAfter = 1;
    renderStep(big);
    const submit = screen.getByRole("button", { name: /^Import/ });

    fireEvent.click(submit);
    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(api.onDone).not.toHaveBeenCalled();

    fireEvent.click(submit);
    await waitFor(() => expect(api.onDone).toHaveBeenCalled());
    expect(api.calls[1]).toEqual([api.calls[0][1]]);
    expect(api.onDone.mock.calls[0][0].orders).toBe(2);
  });
});
