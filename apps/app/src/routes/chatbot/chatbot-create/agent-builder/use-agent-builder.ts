import {
  applySuggestion, createProfile, type AgentProfile, type BusinessTypeId,
} from "@repo/agent-blueprint";
import type { ChatbotCreateRequestDto, ChatbotGetDetailResponseDto } from "@repo/client";
import { useCreateChatbot, useToggleChatbotActivate, useUpdateChatbot } from "@/hooks/api";
import { useAgentBuilderSuggest } from "@/hooks/api/agent-builder";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { builderReducer, initialBuilderState, isDraftReady } from "./builder-state";
import { toChatbotPayload } from "./to-chatbot-payload";

const SAVE_DEBOUNCE_MS = 600;

function baseFrom(chatbot: ChatbotGetDetailResponseDto): Partial<ChatbotCreateRequestDto> {
  const { accounts, ...rest } = chatbot as ChatbotGetDetailResponseDto & { accounts?: { id: string }[] };
  return { ...(rest as Partial<ChatbotCreateRequestDto>), accounts: (accounts ?? []).map((a) => a.id) };
}

export function useAgentBuilder({ hydrateFrom }: { hydrateFrom?: ChatbotGetDetailResponseDto }) {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith("vi") ? "vi" : "en";
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState);
  const suggest = useAgentBuilderSuggest();
  const create = useCreateChatbot();
  const update = useUpdateChatbot();
  const activate = useToggleChatbotActivate();
  const [starting, setStarting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const creating = useRef(false);
  const lastSaved = useRef("");
  // Hydrate a given chatbot id only once: `hydrateFrom` is refetched (a new
  // object reference with the same id) after every autosave, and re-running
  // "hydrate" on each refetch would replace in-progress local answers with
  // the last-saved server snapshot.
  const hydratedId = useRef<string | null>(null);

  const extraInstructions = hydrateFrom?.extraInstructions ?? "";
  const base = useMemo(() => (hydrateFrom ? baseFrom(hydrateFrom) : undefined), [hydrateFrom]);

  useEffect(() => {
    if (!hydrateFrom?.agentProfile) return;
    if (hydratedId.current === hydrateFrom.id) return;
    hydratedId.current = hydrateFrom.id;
    const profile = hydrateFrom.agentProfile as unknown as AgentProfile;
    lastSaved.current = JSON.stringify(toChatbotPayload(profile, extraInstructions, base));
    dispatch({ type: "hydrate", profile, chatbotId: hydrateFrom.id, finished: hydrateFrom.status === "active" });
  }, [hydrateFrom, extraInstructions, base]);

  const startFromDescription = async (description: string) => {
    setStarting(true);
    const suggestion = await suggest.mutateAsync(description).catch(() => null);
    setStarting(false);
    const profile = suggestion ? applySuggestion(suggestion, language) : null;
    dispatch({
      type: "start",
      profile: profile ?? createProfile("ecommerce", language),
      suggestion: profile ? suggestion : null,
      source: "describe",
    });
  };

  const startFromTemplate = (type: BusinessTypeId) =>
    dispatch({ type: "start", profile: createProfile(type, language), suggestion: null, source: "template" });

  // Create the inactive draft as soon as everything up to Rules is answered.
  // A failure is retried on the next state change (the next answer).
  useEffect(() => {
    if (!state.profile || state.chatbotId || creating.current || !isDraftReady(state)) return;
    creating.current = true;
    const body = toChatbotPayload(state.profile, extraInstructions, base);
    create
      .mutateAsync({ ...body, status: "inactive" } as ChatbotCreateRequestDto)
      .then((res) => {
        const id = (res as { data?: { data?: { id?: string } } }).data?.data?.id;
        if (!id) throw new Error("missing chatbot id");
        lastSaved.current = JSON.stringify(body);
        setSaveError(false);
        dispatch({ type: "draftCreated", chatbotId: id });
      })
      .catch(() => setSaveError(true))
      .finally(() => {
        creating.current = false;
      });
  }, [state, extraInstructions, base, create]);

  // After the draft exists, every answer saves the full payload (debounced).
  useEffect(() => {
    if (!state.chatbotId || !state.profile) return;
    const body = toChatbotPayload(state.profile, extraInstructions, base);
    const snapshot = JSON.stringify(body);
    if (snapshot === lastSaved.current) return;
    const id = state.chatbotId;
    const timer = setTimeout(() => {
      update
        .mutateAsync({ id, body })
        .then(() => {
          lastSaved.current = snapshot;
          setSaveError(false);
        })
        .catch(() => setSaveError(true));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.chatbotId, state.profile, extraInstructions, base, update]);

  const finish = async () => {
    if (!state.chatbotId) return;
    await activate.mutateAsync({ id: state.chatbotId, active: true });
    dispatch({ type: "finished" });
  };

  return {
    state, dispatch, startFromDescription, startFromTemplate, starting, saveError,
    finish, finishing: activate.isPending, extraInstructions,
  };
}

export type AgentBuilderController = ReturnType<typeof useAgentBuilder>;
