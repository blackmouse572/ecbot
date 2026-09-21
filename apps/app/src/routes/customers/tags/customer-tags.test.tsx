import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// _DataTable uses useLocation/useNavigate internally, so every render must
// sit under a Router.
const render = (ui: ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

// jsdom doesn't ship ResizeObserver, which Radix's Drawer (used by the
// Medusa UI Drawer) and DropdownMenu (used by the ActionMenu) instantiate
// on mount. Stub a no-op implementation.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
type GlobalWithRO = typeof globalThis & {
  ResizeObserver: typeof ResizeObserverMock;
};
(globalThis as GlobalWithRO).ResizeObserver =
  (globalThis as GlobalWithRO).ResizeObserver ?? ResizeObserverMock;

// jsdom doesn't implement Element.scroll; the DataTable's pagination effect
// calls it on the scroll container after every page change.
if (!HTMLElement.prototype.scroll) {
  HTMLElement.prototype.scroll = () => {};
}

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();
const promptFn = vi.fn();

vi.mock("@/hooks/api/customer-tags", () => ({
  useCustomerTagList: vi.fn(),
  useCreateCustomerTag: vi.fn(() => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  })),
  useUpdateCustomerTag: vi.fn(() => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  })),
  useDeleteCustomerTag: vi.fn(() => ({
    mutateAsync: deleteMutateAsync,
    isPending: false,
  })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn() },
    usePrompt: () => promptFn,
  };
});

// The ActionMenu from @repo/ui is published with classic-runtime JSX that
// doesn't import React. Vitest's transform fails on it ("React is not
// defined"). The behaviour we care about — picking an action — is the
// same whether the actions live in a dropdown or in a flat list of
// buttons, so stub ActionMenu with a flat list and assert on those.
vi.mock("@repo/ui/common-components", async () => {
  const actual = await vi.importActual<
    typeof import("@repo/ui/common-components")
  >("@repo/ui/common-components");
  type Action = { label: string; onClick?: () => void };
  type Group = { actions: Action[] };
  return {
    ...actual,
    ActionMenu: ({ groups }: { groups: Group[] }) => (
      <div data-testid="action-menu">
        {groups.flatMap((g) =>
          g.actions.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick}>
              {a.label}
            </button>
          )),
        )}
      </div>
    ),
    // The real EmojiPickerButton opens a virtualized emoji-search popover
    // (frimousse) — not feasible/meaningful to drive in jsdom. Stub it as a
    // plain text field so tests can exercise the form's emoji value.
    EmojiPickerButton: ({
      value,
      onChange,
      "aria-label": ariaLabel,
    }: {
      value?: string | null;
      onChange: (emoji: string) => void;
      "aria-label"?: string;
    }) => (
      <input
        aria-label={ariaLabel}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

import {
  useCreateCustomerTag,
  useCustomerTagList,
  useDeleteCustomerTag,
  useUpdateCustomerTag,
} from "@/hooks/api/customer-tags";
import { CustomerTags } from "./customer-tags";

const useListMock = vi.mocked(useCustomerTagList);
const useCreateMock = vi.mocked(useCreateCustomerTag);
const useUpdateMock = vi.mocked(useUpdateCustomerTag);
const useDeleteMock = vi.mocked(useDeleteCustomerTag);

// Hook return types — used in `as unknown as ...` to satisfy the lint rule
// (no-explicit-any) without re-implementing every TanStack-Query field.
type UseListReturn = ReturnType<typeof useCustomerTagList>;
type UseCreateReturn = ReturnType<typeof useCreateCustomerTag>;
type UseUpdateReturn = ReturnType<typeof useUpdateCustomerTag>;
type UseDeleteReturn = ReturnType<typeof useDeleteCustomerTag>;

const vipTag = {
  id: "tag-vip",
  name: "VIP",
  emoji: "⭐",
  description: "High value",
  triggersHandoff: false,
};
const angryTag = {
  id: "tag-angry",
  name: "Angry",
  emoji: "🚨",
  description: "upset",
  triggersHandoff: true,
};

beforeEach(() => {
  createMutateAsync.mockReset().mockResolvedValue({ id: "new-tag" });
  updateMutateAsync.mockReset().mockResolvedValue({ id: "tag-vip" });
  deleteMutateAsync.mockReset().mockResolvedValue(undefined);
  promptFn.mockReset();

  useCreateMock.mockReturnValue({
    mutateAsync: createMutateAsync,
    isPending: false,
  } as unknown as UseCreateReturn);
  useUpdateMock.mockReturnValue({
    mutateAsync: updateMutateAsync,
    isPending: false,
  } as unknown as UseUpdateReturn);
  useDeleteMock.mockReturnValue({
    mutateAsync: deleteMutateAsync,
    isPending: false,
  } as unknown as UseDeleteReturn);
});

afterEach(() => {
  vi.clearAllMocks();
});

// The mocked ActionMenu (above) renders edit/delete as flat buttons, so
// the tests can click them directly via getByRole("button", { name }).

describe("CustomerTags settings page", () => {
  it("renders one row per catalog tag from useCustomerTagList", () => {
    useListMock.mockReturnValue({
      tags: [vipTag, angryTag],
      isLoading: false,
    } as unknown as UseListReturn);

    render(<CustomerTags />);

    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("High value")).toBeInTheDocument();
    expect(screen.getByText("Angry")).toBeInTheDocument();
    expect(screen.getByText("upset")).toBeInTheDocument();
  });

  it("clicking 'Create tag' opens the Drawer form", async () => {
    useListMock.mockReturnValue({
      tags: [],
      isLoading: false,
    } as unknown as UseListReturn);
    const user = userEvent.setup();

    render(<CustomerTags />);

    // Drawer not open yet — the form fields are not in the doc.
    expect(
      screen.queryByLabelText("settings.customerTags.fields.name"),
    ).not.toBeInTheDocument();

    const createBtn = screen.getByRole("button", {
      name: "settings.customerTags.actions.create",
    });
    await user.click(createBtn);

    expect(
      await screen.findByLabelText("settings.customerTags.fields.name"),
    ).toBeInTheDocument();
  });

  it("submitting the Create form calls useCreateCustomerTag with the trimmed payload", async () => {
    useListMock.mockReturnValue({
      tags: [],
      isLoading: false,
    } as unknown as UseListReturn);
    const user = userEvent.setup();

    render(<CustomerTags />);

    await user.click(
      screen.getByRole("button", {
        name: "settings.customerTags.actions.create",
      }),
    );

    const nameInput = await screen.findByLabelText(
      "settings.customerTags.fields.name",
    );
    const emojiInput = screen.getByLabelText(
      "settings.customerTags.fields.emoji",
    );
    const descInput = screen.getByLabelText(
      "settings.customerTags.fields.description",
    );

    await user.type(nameInput, "New Tag");
    await user.type(emojiInput, "🎯");
    await user.type(descInput, "Marketing target list");

    // New-tag drawer submit is labelled `actions.create`.
    const submit = screen
      .getAllByRole("button", { name: "actions.create" })
      .find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeDefined();
    await user.click(submit!);

    expect(createMutateAsync).toHaveBeenCalledTimes(1);
    const payload = createMutateAsync.mock.calls[0][0];
    expect(payload.name).toBe("New Tag");
    expect(payload.emoji).toBe("🎯");
    expect(payload.description).toBe("Marketing target list");
    expect(payload.triggersHandoff).toBe(false);
  });

  it("Edit (from the row's ActionMenu) opens the Drawer pre-filled and submit calls useUpdateCustomerTag", async () => {
    useListMock.mockReturnValue({
      tags: [vipTag],
      isLoading: false,
    } as unknown as UseListReturn);
    const user = userEvent.setup();

    render(<CustomerTags />);

    const editButton = screen.getByRole("button", { name: "actions.edit" });
    await user.click(editButton);

    const nameInput = (await screen.findByLabelText(
      "settings.customerTags.fields.name",
    )) as HTMLInputElement;
    expect(nameInput.value).toBe("VIP");

    const emojiInput = screen.getByLabelText(
      "settings.customerTags.fields.emoji",
    ) as HTMLInputElement;
    expect(emojiInput.value).toBe("⭐");

    await user.clear(nameInput);
    await user.type(nameInput, "VIP+");

    // Edit drawer submit is labelled `actions.save` (only "Create" mode uses
    // `actions.create`).
    const submit = screen
      .getAllByRole("button", { name: "actions.save" })
      .find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeDefined();
    await user.click(submit!);

    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    const payload = updateMutateAsync.mock.calls[0][0];
    expect(payload.name).toBe("VIP+");
    expect(payload.emoji).toBe("⭐");
    expect(payload.description).toBe("High value");
    expect(payload.triggersHandoff).toBe(false);
  });

  it("Delete (from the row's ActionMenu) opens a confirmation prompt; confirming calls useDeleteCustomerTag with the tag id", async () => {
    useListMock.mockReturnValue({
      tags: [vipTag],
      isLoading: false,
    } as unknown as UseListReturn);
    promptFn.mockResolvedValue(true);

    const user = userEvent.setup();
    render(<CustomerTags />);

    const deleteButton = screen.getByRole("button", {
      name: "actions.delete",
    });
    await user.click(deleteButton);

    expect(promptFn).toHaveBeenCalledTimes(1);
    const promptArgs = promptFn.mock.calls[0][0];
    expect(promptArgs.variant).toBe("danger");

    // promptFn is async; let the handler resume.
    await Promise.resolve();
    await Promise.resolve();

    expect(deleteMutateAsync).toHaveBeenCalledWith("tag-vip");
  });

  it("cancelling the delete prompt does NOT call useDeleteCustomerTag", async () => {
    useListMock.mockReturnValue({
      tags: [vipTag],
      isLoading: false,
    } as unknown as UseListReturn);
    promptFn.mockResolvedValue(false);

    const user = userEvent.setup();
    render(<CustomerTags />);

    const deleteButton = screen.getByRole("button", {
      name: "actions.delete",
    });
    await user.click(deleteButton);

    await Promise.resolve();
    await Promise.resolve();

    expect(promptFn).toHaveBeenCalledTimes(1);
    expect(deleteMutateAsync).not.toHaveBeenCalled();
  });
});
