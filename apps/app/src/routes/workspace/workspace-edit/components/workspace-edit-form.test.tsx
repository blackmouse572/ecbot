import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import type { ReactNode } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn().mockResolvedValue({});
const handleSuccess = vi.hoisted(() => vi.fn());

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
    useRouteModal: () => ({ handleSuccess }),
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

describe("WorkspaceEditForm slugs", () => {
  // Workspaces created before slugs were lowercased carry capitals.
  const legacy = {
    name: "Bep Nha Mo",
    slug: "QA-Bep-Nha-Mo",
  } as unknown as WorkSpaceGetResponseDto;

  it("saves a name change on a workspace whose existing slug has capitals", async () => {
    mutateAsync.mockClear();
    render(<WorkspaceEditForm workspace={legacy} />);
    const user = userEvent.setup();

    const name = screen.getByDisplayValue("Bep Nha Mo");
    await user.clear(name);
    await user.type(name, "Bep Nha Mo 2");
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Bep Nha Mo 2",
        slug: "QA-Bep-Nha-Mo",
      }),
    );
  });

  it("still rejects a changed slug that is not lowercase", async () => {
    mutateAsync.mockClear();
    render(<WorkspaceEditForm workspace={legacy} />);
    const user = userEvent.setup();

    const slug = screen.getByDisplayValue("QA-Bep-Nha-Mo");
    await user.clear(slug);
    await user.type(slug, "New-Slug");
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    // Validation blocks the save (the message itself is i18n, not mocked here).
    await new Promise((r) => setTimeout(r, 100));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("goes to the new URL after the slug changes", async () => {
    handleSuccess.mockClear();
    render(<WorkspaceEditForm workspace={legacy} />);
    const user = userEvent.setup();

    const slug = screen.getByDisplayValue("QA-Bep-Nha-Mo");
    await user.clear(slug);
    await user.type(slug, "bep-nha-mo");
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(handleSuccess).toHaveBeenCalledWith(
        "/bep-nha-mo/settings/workspace",
      ),
    );
  });
});
