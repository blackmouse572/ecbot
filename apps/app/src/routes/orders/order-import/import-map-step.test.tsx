import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  previewChunks: new Array<unknown>(),
  imported: new Array<unknown>(),
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
      onChunk(result(1));
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

const renderStep = () =>
  render(
    <MemoryRouter initialEntries={["/ws/orders/import"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/orders/import"
          element={
            <ImportMapStep file={file} onBack={vi.fn()} onDone={api.onDone} />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ImportMapStep", () => {
  beforeEach(() => {
    api.onDone.mockReset();
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
});
