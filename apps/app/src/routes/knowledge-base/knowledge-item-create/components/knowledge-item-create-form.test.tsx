import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  created: [] as unknown[],
  processed: [] as unknown[],
  linked: [] as unknown[],
  calls: [] as string[],
  createError: null as unknown,
  linkFailed: 0,
}));
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});

vi.mock("../../../../hooks/api", () => ({
  useKnowledgeTags: () => ({ tags: [], isLoading: false }),
  useCreateKnowledgeItem: () => ({
    mutateAsync: async (data: unknown) => {
      if (api.createError) throw api.createError;
      api.created.push(data);
      return { data: { data: { id: "item-1" } } };
    },
  }),
  useProcessKnowledgeItem: () => ({
    mutateAsync: async (args: unknown) => {
      api.calls.push("process");
      api.processed.push(args);
    },
  }),
  useChatbots: () => ({
    chatbots: [
      { id: "bot-1", name: "Sales agent" },
      { id: "bot-2", name: "Support agent" },
    ],
    isLoading: false,
    isError: false,
  }),
  useLinkKnowledgeItemToChatbots: () => ({
    mutateAsync: async (args: unknown) => {
      api.calls.push("link");
      api.linked.push(args);
      return { failed: api.linkFailed };
    },
  }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    useRouteModal: () => ({ handleSuccess: () => {} }),
    RouteFocusModal: Object.assign(Pass, {
      Form: ({ form, children }: { form: never; children: ReactNode }) => (
        <Form {...(form as object)}>{children}</Form>
      ),
      Header: Pass,
      Body: Pass,
    }),
  };
});

import { KnowledgeItemCreateForm } from "./knowledge-item-create-form";

describe("KnowledgeItemCreateForm", () => {
  beforeEach(() => {
    api.created = [];
    api.processed = [];
    api.linked = [];
    api.calls = [];
    api.createError = null;
    api.linkFailed = 0;
    toast.error.mockReset();
    toast.info.mockReset();
  });

  // #168: the API now says why a file is refused (empty, not really a PDF);
  // a generic "Failed to create" hid it.
  it("shows the API's reason when the item is refused", async () => {
    api.createError = Object.assign(new Error("Request failed"), {
      response: {
        status: 422,
        data: { statusCode: 5026, message: "The file is empty." },
      },
    });
    const { container } = render(
      <NuqsTestingAdapter searchParams="?t=TEXT">
        <KnowledgeItemCreateForm workspaceSlug="ws" knowledgeBaseId="kb-1" />
      </NuqsTestingAdapter>,
    );

    fireEvent.change(container.querySelector('input[name="title"]')!, {
      target: { value: "Return policy" },
    });
    fireEvent.change(container.querySelector('textarea[name="content"]')!, {
      target: { value: "Returns are accepted within 7 days." },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("The file is empty."),
    );
  });

  it("starts processing a new TEXT item right away instead of leaving it a draft", async () => {
    const { container } = render(
      <NuqsTestingAdapter searchParams="?t=TEXT">
        <KnowledgeItemCreateForm workspaceSlug="ws" knowledgeBaseId="kb-1" />
      </NuqsTestingAdapter>,
    );

    fireEvent.change(container.querySelector('input[name="title"]')!, {
      target: { value: "Return policy" },
    });
    fireEvent.change(container.querySelector('textarea[name="content"]')!, {
      target: { value: "Returns are accepted within 7 days." },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(api.created).toHaveLength(1));
    await waitFor(() =>
      expect(api.processed).toEqual([
        { knowledgeBaseId: "kb-1", id: "item-1" },
      ]),
    );
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  const fillTextItem = (container: HTMLElement) => {
    fireEvent.change(container.querySelector('input[name="title"]')!, {
      target: { value: "Return policy" },
    });
    fireEvent.change(container.querySelector('textarea[name="content"]')!, {
      target: { value: "Returns are accepted within 7 days." },
    });
  };

  const renderTextForm = () =>
    render(
      <NuqsTestingAdapter searchParams="?t=TEXT">
        <KnowledgeItemCreateForm workspaceSlug="ws" knowledgeBaseId="kb-1" />
      </NuqsTestingAdapter>,
    );

  // #163: the create form had no way to pick which agents use the item.
  it("links the new item to the chosen agents before processing it", async () => {
    const { container } = renderTextForm();
    fillTextItem(container);

    fireEvent.click(screen.getByRole("checkbox", { name: "Support agent" }));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(api.processed).toHaveLength(1));
    expect(api.linked).toEqual([
      { knowledgeItemId: "item-1", chatbotIds: ["bot-2"] },
    ]);
    // Ingestion stamps the linked agents on the vectors, so link first.
    expect(api.calls).toEqual(["link", "process"]);
  });

  it("does not call the link endpoint when no agent is chosen", async () => {
    const { container } = renderTextForm();
    fillTextItem(container);
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(api.processed).toHaveLength(1));
    expect(api.linked).toEqual([]);
  });

  it("tells the user when some agents could not be linked", async () => {
    api.linkFailed = 1;
    const { container } = renderTextForm();
    fillTextItem(container);
    fireEvent.click(screen.getByRole("checkbox", { name: "Sales agent" }));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(api.processed).toHaveLength(1));
    expect(toast.info).toHaveBeenCalledWith(
      "Item created, but 1 agent could not be linked. Link it from the agent's Knowledge Base section.",
    );
  });

  const renderFileForm = () =>
    render(
      <NuqsTestingAdapter searchParams="?t=FILE">
        <KnowledgeItemCreateForm workspaceSlug="ws" knowledgeBaseId="kb-1" />
      </NuqsTestingAdapter>,
    );

  it("selects the whole auto-filled title so typing replaces it", async () => {
    const { container } = renderFileForm();
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["q"], "kunmart-faq.pdf", { type: "application/pdf" }),
        ],
      },
    });
    const title = container.querySelector<HTMLInputElement>(
      'input[name="title"]',
    )!;
    await waitFor(() => expect(title.value).toBe("kunmart-faq"));

    fireEvent.focus(title);

    expect([title.selectionStart, title.selectionEnd]).toEqual([0, 11]);
  });

  // #167: a new FILE item must start processing like URL and TEXT do,
  // not wait in Draft for the "Process" action.
  it("starts processing a new FILE item right away, once", async () => {
    const { container } = renderFileForm();
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["q"], "kunmart-faq.pdf", { type: "application/pdf" }),
        ],
      },
    });
    await waitFor(() =>
      expect(
        container.querySelector<HTMLInputElement>('input[name="title"]')!.value,
      ).toBe("kunmart-faq"),
    );
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(api.created).toHaveLength(1));
    expect(api.created[0]).toMatchObject({ type: "FILE" });
    await waitFor(() =>
      expect(api.processed).toEqual([
        { knowledgeBaseId: "kb-1", id: "item-1" },
      ]),
    );
  });

  it("gives the tag picker a placeholder", () => {
    renderFileForm();
    expect(
      screen.getByPlaceholderText("Enter tag name..."),
    ).toBeInTheDocument();
  });
});
