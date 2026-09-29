import "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Queued answers for the join endpoint, one per call.
const join = vi.hoisted(() => ({
  calls: 0,
  answers: [] as Array<() => Promise<unknown>>,
}));

vi.mock("@repo/client", async () => {
  const actual =
    await vi.importActual<typeof import("@repo/client")>("@repo/client");
  return {
    ...actual,
    workspaceMemberControllerJoinWorkspaceV1: () => {
      const answer =
        join.answers[Math.min(join.calls, join.answers.length - 1)];
      join.calls += 1;
      return answer();
    },
  };
});

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    RouteFocusModal: Object.assign(Pass, {
      Header: Pass,
      Body: Pass,
      Footer: Pass,
    }),
  };
});

import { JoinForm } from "./join-form";

const apiError = (status: number, statusCode: number, message: string) =>
  Object.assign(new Error(`HTTP ${status}`), {
    response: { status, data: { statusCode, message } },
  });

const joined = () => Promise.resolve({ data: {} });
const alreadyMember = () =>
  Promise.reject(
    apiError(409, 5206, "This member is already in the workspace"),
  );

const renderJoin = () =>
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/join?tokens=invite-token"]}>
          <JoinForm />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );

describe("JoinForm", () => {
  beforeEach(() => {
    join.calls = 0;
    join.answers = [];
  });

  it("sends the join request once and shows success", async () => {
    join.answers = [joined, alreadyMember];

    renderJoin();

    expect(await screen.findByText("Workspace joined")).toBeInTheDocument();
    expect(join.calls).toBe(1);
    expect(
      screen.queryByText("This member is already in the workspace"),
    ).not.toBeInTheDocument();
  });

  it("treats an already-member answer as a successful join", async () => {
    join.answers = [alreadyMember];

    renderJoin();

    expect(await screen.findByText("Workspace joined")).toBeInTheDocument();
  });

  it("shows the API's reason when the invitation is invalid", async () => {
    join.answers = [
      () =>
        Promise.reject(apiError(401, 5211, "The invitation link is invalid")),
    ];

    renderJoin();

    expect(
      await screen.findByText("The invitation link is invalid"),
    ).toBeInTheDocument();
  });
});
