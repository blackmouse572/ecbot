import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillFormData } from "../schemas";

const api = vi.hoisted(() => ({
  created: [] as unknown[],
  attached: [] as { chatbotId: string; skillId: string }[],
  attachError: null as unknown,
  attachGate: null as Promise<void> | null,
  prev: undefined as unknown,
  handleSuccess: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});

vi.mock("@/hooks/api/skills", () => ({
  useCreateSkill: () => ({
    createSkill: async (body: unknown) => {
      api.created.push(body);
      return { data: { data: { id: "skill-1" } } };
    },
    isPending: false,
  }),
  useAttachSkillToChatbot: (_ws: string, chatbotId: string) => ({
    attachSkillToChatbot: async ({ skillId }: { skillId: string }) => {
      if (api.attachGate) await api.attachGate;
      if (api.attachError) throw api.attachError;
      api.attached.push({ chatbotId, skillId });
    },
  }),
}));

// The real fields use a rich-text editor jsdom can't drive.
vi.mock("../components/skill-form", () => ({
  SkillFormFields: ({ form }: { form: UseFormReturn<SkillFormData> }) => (
    <>
      <input {...form.register("name")} />
      <textarea {...form.register("instructions")} />
    </>
  ),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    useRouteModal: () => ({ handleSuccess: api.handleSuccess }),
    RouteFocusModal: Object.assign(
      ({ prev, children }: { prev?: string; children?: ReactNode }) => {
        api.prev = prev;
        return <>{children}</>;
      },
      {
        Form: ({ form, children }: { form: never; children: ReactNode }) => (
          <Form {...(form as object)}>{children}</Form>
        ),
        Header: Pass,
        Body: Pass,
        Footer: Pass,
        Close: Pass,
      },
    ),
  };
});

import { SkillCreate } from "./skill-create";

const renderAt = (url: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/:workspaceSlug/skills/create"
            element={<SkillCreate />}
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const submit = (container: HTMLElement) => {
  fireEvent.change(container.querySelector('input[name="name"]')!, {
    target: { value: "Refunds" },
  });
  fireEvent.change(container.querySelector('textarea[name="instructions"]')!, {
    target: { value: "Explain the refund policy." },
  });
  fireEvent.submit(container.querySelector("form")!);
};

describe("SkillCreate", () => {
  beforeEach(() => {
    api.created = [];
    api.attached = [];
    api.attachError = null;
    api.attachGate = null;
    api.prev = undefined;
    api.handleSuccess.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });

  // #283: created from an agent's page, the skill lands on that agent.
  it("attaches the new skill to the agent it was opened from and returns there", async () => {
    const { container } = renderAt("/ws/skills/create?agent=bot-1");
    expect(api.prev).toBe("/ws/chatbot/bot-1");

    submit(container);

    await waitFor(() => expect(api.handleSuccess).toHaveBeenCalled());
    expect(api.attached).toEqual([{ chatbotId: "bot-1", skillId: "skill-1" }]);
    expect(toast.success).toHaveBeenCalledWith(
      "Skill created and added to the agent",
    );
  });

  it("keeps Create disabled until the attach finishes, so a second click can't duplicate the skill", async () => {
    let release = () => {};
    api.attachGate = new Promise<void>((r) => (release = r));
    const { container } = renderAt("/ws/skills/create?agent=bot-1");

    submit(container);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create/i })).toBeDisabled(),
    );
    release();
    await waitFor(() => expect(api.handleSuccess).toHaveBeenCalled());
    expect(api.created).toHaveLength(1);
  });

  it("still returns to the agent when attaching fails", async () => {
    api.attachError = new Error("boom");
    const { container } = renderAt("/ws/skills/create?agent=bot-1");

    submit(container);

    await waitFor(() => expect(api.handleSuccess).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(
      "Skill created, but it could not be added to the agent. Add it from the agent's Skills section.",
    );
  });

  it("does not attach anything when opened from the skills list", async () => {
    const { container } = renderAt("/ws/skills/create");
    expect(api.prev).toBeUndefined();

    submit(container);

    await waitFor(() => expect(api.handleSuccess).toHaveBeenCalled());
    expect(api.created).toHaveLength(1);
    expect(api.attached).toEqual([]);
    expect(toast.success).toHaveBeenCalledWith("Skill created");
  });
});
