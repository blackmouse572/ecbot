import "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  created: new Array<unknown>(),
  children: new Array<unknown>(),
}));

vi.mock("@/hooks/api/tracked-links", () => ({
  useTrackedLink: () => ({ link: { children: api.children } }),
  useCreateTrackedLinkChild: () => ({
    mutateAsync: async (body: { name: string; kind: string }) => {
      api.created.push(body);
    },
    isPending: false,
  }),
}));

import type { TrackedLinkGetResponseDto } from "@/hooks/api/tracked-links";
import { SourceLinkDialog } from "./source-link-dialog";

const source: TrackedLinkGetResponseDto = {
  id: "tl-1",
  name: "Tờ rơi Tết",
  code: "to-roi-tet",
  kind: "LINK",
  status: "ACTIVE",
  url: "https://m.me/1234?ref=to-roi-tet",
  tagIds: [],
  promisesOffer: false,
  account: { id: "acc-1", name: "Lumi Skincare", type: "FACEBOOK_PAGE" },
  createdAt: "2026-11-10T00:00:00Z",
};

const renderDialog = () =>
  render(
    <MemoryRouter initialEntries={["/ws/sources/tl-1"]}>
      <TooltipProvider>
        <Routes>
          <Route
            path="/:workspaceSlug/sources/:sourceId"
            element={
              <SourceLinkDialog source={source} kind="KOL" onClose={() => {}} />
            }
          />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );

describe("SourceLinkDialog", () => {
  beforeEach(() => {
    api.created = [];
    api.children = [
      {
        ...source,
        id: "tl-2",
        name: "Minh Thư",
        code: "to-roi-tet-minh-thu",
        kind: "KOL",
        url: "https://m.me/1234?ref=to-roi-tet-minh-thu",
      },
      { ...source, id: "tl-3", name: "Quầy 1", kind: "QR" },
    ];
  });

  it("shows the KOL's link as the name is typed, then creates it", async () => {
    renderDialog();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Linh Đan" },
    });
    expect(screen.getByText("m.me/1234?ref=to-roi-tet-linh-dan")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() =>
      expect(api.created).toEqual([{ name: "Linh Đan", kind: "KOL" }]),
    );
  });

  it("lists only the KOL links already made", () => {
    renderDialog();

    expect(screen.getByText("Minh Thư")).toBeTruthy();
    expect(screen.getByText("1 KOL")).toBeTruthy();
    expect(screen.queryByText("Quầy 1")).toBeNull();
  });
});
