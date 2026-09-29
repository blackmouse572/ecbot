import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import type { ReactNode } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

vi.mock("@/hooks/api/workspace", () => ({
  useEditWorkspace: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
    RouteDrawer: Object.assign(Pass, {
      Form: ({
        form,
        children,
      }: {
        form: UseFormReturn;
        children: ReactNode;
      }) => <FormProvider {...form}>{children}</FormProvider>,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { WorkspaceEditForm } from "./workspace-edit-form";

const workspace = {
  name: "Acme",
  slug: "acme",
  avatar: "https://cdn.example/a.png",
} as unknown as WorkSpaceGetResponseDto;

describe("WorkspaceEditForm", () => {
  // The update DTO has no avatar, and the API rejects undeclared body keys.
  it("sends only the fields the update endpoint declares", async () => {
    render(<WorkspaceEditForm workspace={workspace} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ name: "Acme", slug: "acme" }),
    );
  });
});
