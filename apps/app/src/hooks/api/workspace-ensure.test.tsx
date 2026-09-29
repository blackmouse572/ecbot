import { LAST_WORKSPACE_STORAGE_KEY } from "@/modules/workspace";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ALPHA = { id: "1", slug: "alpha", name: "Alpha" };
const BETA = { id: "2", slug: "beta", name: "Beta" };
// Just created: the workspace exists, but the cached list predates it.
const GAMMA = { id: "3", slug: "gamma", name: "Gamma" };

vi.mock("@repo/client", () => ({
  workspaceControllerGetListWorkSpaceV1: vi.fn(async () => ({
    data: { data: [ALPHA, BETA] },
  })),
  workspaceControllerDetailsV1: vi.fn(async ({ path }: A) => ({
    data: {
      data: [ALPHA, BETA, GAMMA].find((w) => w.slug === path.workspace),
    },
  })),
  workspaceControllerCreateWorkSpaceV1: vi.fn(),
  workspaceControllerUpdateWorkSpaceV1: vi.fn(),
  workspaceControllerDeleteWorkSpaceV1: vi.fn(),
}));

import { useEnsureWorkspace } from "./workspace";

const LocationProbe = () => <p data-testid="path">{useLocation().pathname}</p>;

const renderAt = (pathname: string) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route
            path=":workspaceSlug/*"
            element={
              <>
                {children}
                <LocationProbe />
              </>
            }
          />
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

describe("useEnsureWorkspace with a workspace missing from a stale list", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stays on a just-created workspace the stale list does not have yet", async () => {
    const { result } = renderAt("/gamma/dashboard");

    // Wait until the workspace itself has loaded, then give the guard a turn.
    await waitFor(() => expect(result.current).toBeDefined());
    await new Promise((r) => setTimeout(r, 50));

    expect(document.querySelector('[data-testid="path"]')?.textContent).toBe(
      "/gamma/dashboard",
    );
  });

  it("still redirects a slug that is neither listed nor loadable", async () => {
    renderAt("/not-a-workspace/dashboard");

    await waitFor(() =>
      expect(document.querySelector('[data-testid="path"]')?.textContent).toBe(
        "/alpha/dashboard",
      ),
    );
  });
});
