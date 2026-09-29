import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatbotFormData } from "../../../schemas";

const updateChatbot = vi.fn().mockResolvedValue({});
// Stable across renders: the form reseeds its defaults when it changes.
const chatbot = { id: "bot-1", name: "Lotus", accounts: [], maxTokens: 500 };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "bot-1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/modals", () => ({
  RouteFocusModal: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useRouteModal: () => ({ handleSuccess: vi.fn() }),
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "ws" }),
}));

vi.mock("@/hooks/api/chatbot", () => ({
  useChatbot: () => ({
    chatbot,
    isLoading: false,
    isError: false,
  }),
  useUpdateChatbot: () => ({ mutateAsync: updateChatbot, isPending: false }),
}));

// A cleared "Max tokens" input reaches onSubmit as undefined.
const submitted = {
  name: "Lotus",
  type: "beauty",
  accounts: [],
  maxTokens: undefined,
} as unknown as ChatbotFormData;

vi.mock("../../../components/chatbot-form", () => ({
  ChatbotForm: ({
    onSubmit,
  }: {
    onSubmit: (data: ChatbotFormData) => void;
  }) => <button onClick={() => onSubmit(submitted)}>submit</button>,
}));

import { ChatbotEditForm } from "./chatbot-edit-form";

describe("ChatbotEditForm", () => {
  // The update merges and JSON drops undefined, so a cleared field must go
  // out as null or the stored value would stay.
  it("sends a cleared field as null", async () => {
    render(<ChatbotEditForm />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(updateChatbot).toHaveBeenCalled());
    expect(updateChatbot.mock.calls[0][0].body).toHaveProperty(
      "maxTokens",
      null,
    );
  });
});
