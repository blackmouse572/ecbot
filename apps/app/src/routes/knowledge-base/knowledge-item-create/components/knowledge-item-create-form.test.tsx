import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  created: [] as unknown[],
  processed: [] as unknown[],
}));

vi.mock("../../../../hooks/api", () => ({
  useKnowledgeTags: () => ({ tags: [], isLoading: false }),
  useCreateKnowledgeItem: () => ({
    mutateAsync: async (data: unknown) => {
      api.created.push(data);
      return { data: { data: { id: "item-1" } } };
    },
  }),
  useProcessKnowledgeItem: () => ({
    mutateAsync: async (args: unknown) => {
      api.processed.push(args);
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

  it("gives the tag picker a placeholder", () => {
    renderFileForm();
    expect(
      screen.getByPlaceholderText("Enter tag name..."),
    ).toBeInTheDocument();
  });
});
