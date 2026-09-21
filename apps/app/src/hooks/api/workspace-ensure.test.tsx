import { LAST_WORKSPACE_STORAGE_KEY } from "@/modules/workspace";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ALPHA = { id: "1", slug: "alpha", name: "Alpha" };
const BETA = { id: "2", slug: "beta", name: "Beta" };

vi.mock("@repo/client", () => ({
  workspaceControllerGetListWorkSpaceV1: vi.fn(async () => ({
    data: { data: [ALPHA, BETA] },
  })),
  workspaceControllerDetailsV1: vi.fn(async ({ path }: A) => ({
    data: { data: [ALPHA, BETA].find((w) => w.slug === path.workspace) },
  })),
  workspaceControllerCreateWorkSpaceV1: vi.fn(),
  workspaceControllerUpdateWorkSpaceV1: vi.fn(),
  workspaceControllerDeleteWorkSpaceV1: vi.fn(),
}));

import { useEnsureWorkspace } from "./workspace";

const renderAt = (pathname: string) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route path=":workspaceSlug/*" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return renderHook(() => useEnsureWorkspace(), { wrapper });
};

describe("useEnsureWorkspace — remembering the workspace in the URL", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists the slug from the URL once it is known to be accessible", async () => {
    renderAt("/beta/chatbot");

    await waitFor(() =>
      expect(localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY)).toBe(
        JSON.stringify("beta"),
      ),
    );
  });

  it("remembers the fallback workspace after an inaccessible slug redirects", async () => {
    renderAt("/not-a-workspace/dashboard");

    // The bogus slug is never persisted; the workspace we land on is.
    await waitFor(() =>
      expect(localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY)).toBe(
        JSON.stringify("alpha"),
      ),
    );
  });
});
