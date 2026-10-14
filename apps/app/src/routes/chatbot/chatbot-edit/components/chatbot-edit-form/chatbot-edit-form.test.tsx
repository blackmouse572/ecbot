import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import type { ReactNode } from "react";
import {
  FormProvider,
  useFormContext,
  type UseFormReturn,
} from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

const updateChatbot = vi.fn().mockResolvedValue({});
const handleSuccess = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/hooks/api/chatbot", () => ({
  useUpdateChatbot: () => ({ mutateAsync: updateChatbot, isPending: false }),
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

import { ChatbotEditForm } from "./chatbot-edit-form";

const chatbot = {
  id: "bot-1",
  name: "Lotus",
  welcomeMessage: "Hello",
  maxTokens: 500,
  accounts: [],
} as unknown as ChatbotGetDetailResponseDto;

const MaxTokensInput = () => {
  const { register } = useFormContext();
  return <input aria-label="max tokens" {...register("maxTokens")} />;
};

describe("ChatbotEditForm", () => {
  // A drawer edits one card: sending other fields would overwrite them with
  // whatever the form defaulted to.
  it("sends only the fields of its own card", async () => {
    render(
      <ChatbotEditForm
        chatbot={chatbot}
        fields={["welcomeMessage", "fallbackMessage"]}
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() => expect(updateChatbot).toHaveBeenCalled());
    expect(updateChatbot.mock.calls[0][0]).toEqual({
      id: "bot-1",
      body: { welcomeMessage: "Hello", fallbackMessage: null },
    });
    expect(handleSuccess).toHaveBeenCalled();
  });

  // The update merges and JSON drops undefined, so a cleared field must go
  // out as null or the stored value would stay.
  it("sends a cleared field as null", async () => {
    updateChatbot.mockClear();
    render(
      <ChatbotEditForm chatbot={chatbot} fields={["maxTokens"]}>
        <MaxTokensInput />
      </ChatbotEditForm>,
    );
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("max tokens"));
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() => expect(updateChatbot).toHaveBeenCalled());
    expect(updateChatbot.mock.calls[0][0].body).toEqual({ maxTokens: null });
  });
});
