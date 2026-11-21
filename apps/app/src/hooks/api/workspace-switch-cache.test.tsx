import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { FC } from "react";
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Each workspace has its own Team rows. `jaden` belongs to both, with a
// different role in each, so per-member and per-role details collide too.
const ROWS = {
  alpha: {
    members: ["alpha-jaden", "alpha-test_account2"],
    invitations: ["alpha-invitee"],
    member: "alpha-role-Marketing",
    role: "alpha-role-detail",
  },
  beta: {
    members: ["beta-jaden"],
    invitations: ["beta-invitee"],
    member: "beta-role-Owner",
    role: "beta-role-detail",
  },
} as const;

type Slug = keyof typeof ROWS;

const page = (names: readonly string[]) => ({
  data: {
    data: names.map((name) => ({ id: name, name })),
    _metadata: { pagination: { total: names.length } },
  },
});

vi.mock("@repo/client", () => ({
  workspaceMemberControllerMembersV1: vi.fn(async ({ path }: A) =>
    page(ROWS[path.workspace as Slug].members),
  ),
  invitationWorkspaceControllerGetInvitationsV1: vi.fn(async ({ path }: A) =>
    page(ROWS[path.workspace as Slug].invitations),
  ),
  workspaceMemberControllerMemberDetailsV1: vi.fn(async ({ path }: A) => ({
    data: { data: { name: ROWS[path.workspace as Slug].member } },
  })),
  roleWorkspaceControllerGetV1: vi.fn(async ({ path }: A) => ({
    data: { data: { name: ROWS[path.workspace as Slug].role } },
  })),
}));

import { useInvitations } from "./invitations";
import { useWorkspaceMember, useWorkspaceMembers } from "./workspace-member";
import { useWorkspaceRole } from "./workspace-roles";

/** Every text a render put on screen, tagged with the workspace in the URL. */
const rendered: { slug: string; text: string }[] = [];

const TeamPage: FC = () => {
  const { workspaceSlug = "" } = useParams();
  const navigate = useNavigate();
  const { members, isLoading } = useWorkspaceMembers();
  const { invitations } = useInvitations();
  const { member } = useWorkspaceMember("jaden");
  const { role } = useWorkspaceRole("marketing");

  const texts = [
    ...members.map((m: A) => m.name as string),
    ...(invitations ?? []).map((i: A) => i.name as string),
    ...(member ? [(member as A).name as string] : []),
    ...(role ? [role.name as string] : []),
  ];
  texts.forEach((text) => rendered.push({ slug: workspaceSlug, text }));

  return (
    <div>
      {isLoading && <p>loading</p>}
      {texts.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <button onClick={() => navigate("/beta/settings/members")}>switch</button>
    </div>
  );
};

describe("switching workspace on the Team settings pages (QA D17)", () => {
  it("shows the new workspace's rows and never the previous workspace's", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/alpha/settings/members"]}>
          <Routes>
            <Route
              path=":workspaceSlug/settings/members"
              element={<TeamPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("alpha-test_account2")).toBeTruthy();
    expect(await screen.findByText("alpha-role-detail")).toBeTruthy();

    await act(async () => screen.getByText("switch").click());

    expect(await screen.findByText("beta-jaden")).toBeTruthy();
    expect(await screen.findByText("beta-invitee")).toBeTruthy();
    expect(await screen.findByText("beta-role-Owner")).toBeTruthy();
    expect(await screen.findByText("beta-role-detail")).toBeTruthy();

    const leaked = rendered.filter(
      ({ slug, text }) => slug === "beta" && text.startsWith("alpha-"),
    );
    expect(leaked).toEqual([]);
  });
});
