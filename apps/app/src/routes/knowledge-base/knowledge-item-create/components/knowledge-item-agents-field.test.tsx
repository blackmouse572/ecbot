import "@/i18n";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/common-components";
import { describe, expect, it, vi } from "vitest";

const chatbots = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/api", () => ({ useChatbots: chatbots }));

import { KnowledgeItemAgentsField } from "./knowledge-item-agents-field";
import type { KnowledgeItemCreateFormValues } from "./schema";

const Harness = () => {
  const form = useForm<KnowledgeItemCreateFormValues>({
    defaultValues: { chatbotIds: [] } as never,
  });
  return (
    <Form {...form}>
      <KnowledgeItemAgentsField control={form.control} />
    </Form>
  );
};

// #248 review: the checklist had no accessible group name, listed archived
// agents and showed nothing while loading.
describe("KnowledgeItemAgentsField", () => {
  it("is a named group of the agents that are not archived", () => {
    chatbots.mockReturnValue({
      chatbots: [
        { id: "a", name: "Linh", status: "active" },
        { id: "b", name: "Old bot", status: "archived" },
        { id: "c", name: "Paused", status: "inactive" },
      ],
      isLoading: false,
      isError: false,
    });
    render(<Harness />);

    const group = screen.getByRole("group", {
      name: /agents that use this item/i,
    });
    expect(group).toBeTruthy();
    expect(screen.getByLabelText("Linh")).toBeTruthy();
    expect(screen.getByLabelText("Paused")).toBeTruthy();
    expect(screen.queryByLabelText("Old bot")).toBeNull();
  });

  it("says it is loading the agents", () => {
    chatbots.mockReturnValue({ chatbots: [], isLoading: true, isError: false });
    render(<Harness />);

    expect(screen.getByText(/loading agents/i)).toBeTruthy();
  });
});
