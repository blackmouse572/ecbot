import {
  applySuggestion, createProfile, type AgentProfile, type BusinessTypeId,
} from "@repo/agent-blueprint";
import type { ChatbotCreateRequestDto, ChatbotGetDetailResponseDto } from "@repo/client";
import { useCreateChatbot, useToggleChatbotActivate, useUpdateChatbot } from "@/hooks/api";
import { useAgentBuilderSuggest } from "@/hooks/api/agent-builder";
import { toast } from "@medusajs/ui";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { builderReducer, initialBuilderState, isDraftReady } from "./builder-state";
import { toChatbotPayload } from "./to-chatbot-payload";

const SAVE_DEBOUNCE_MS = 600;

/**
 * The chatbot's editable fields only. Read-only ones (timestamps, ids, the
 * compiled prompt) change on every refetch and would make each one look like
 * an unsaved edit. `accounts` is excluded too (fix round 3): it never
 * travels through this payload, only the guarded link/unlink endpoints
 * change it, so a reopened bot's existing linked accounts can never
 * reintroduce themselves into an autosave body. toChatbotPayload also
 * forces `accounts: []` unconditionally, as a second, independent guard.
 */
const READ_ONLY_FIELDS = new Set<string>([
  "id", "createdAt", "createdBy", "updatedAt", "updatedBy", "deleted", "deletedAt", "deletedBy",
  "generalKnowledge", "workspace", "status", "modelProvider", "accounts",
]);

function baseFrom(chatbot: ChatbotGetDetailResponseDto): Partial<ChatbotCreateRequestDto> {
  const editable = Object.fromEntries(Object.entries(chatbot).filter(([key]) => !READ_ONLY_FIELDS.has(key)));
  return editable as Partial<ChatbotCreateRequestDto>;
}

export function useAgentBuilder({ hydrateFrom: source }: { hydrateFrom?: ChatbotGetDetailResponseDto }) {
  // A chatbot made without the builder has no profile to resume: start fresh
  // instead, so the new draft never takes over its accounts or settings.
  const hydrateFrom = source?.agentProfile ? source : undefined;
  const { t, i18n } = useTranslation();
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
  // The last snapshot a save failed on: it is retried only once the profile
  // changes, never in a loop on re-render.
  const failed = useRef("");
  // The debounced save not sent yet, flushed on unmount.
  const pending = useRef<{ id: string; body: ChatbotCreateRequestDto; snapshot: string } | null>(null);
  // Hydrate a given chatbot id only once: `hydrateFrom` is refetched (a new
  // object reference with the same id) after every autosave, and re-running
  // "hydrate" on each refetch would replace in-progress local answers with
  // the last-saved server snapshot.
  const hydratedId = useRef<string | null>(null);

  const extraInstructions = hydrateFrom?.extraInstructions ?? "";
  // `state.linkedAccounts` (builder-state.ts) is for the UI and the channels
  // answer only; it never feeds into `base`/the autosave payload (fix
  // round 3: account membership changes only through the guarded
  // link/unlink endpoints, never through this create/update body).
  const base = useMemo(() => (hydrateFrom ? baseFrom(hydrateFrom) : {}), [hydrateFrom]);

  useEffect(() => {
    if (!hydrateFrom?.agentProfile) return;
    if (hydratedId.current === hydrateFrom.id) return;
    hydratedId.current = hydrateFrom.id;
    const profile = hydrateFrom.agentProfile as unknown as AgentProfile;
    const accounts = (hydrateFrom.accounts ?? []).map((a) => ({ id: a.id, type: a.type, name: a.name }));
    lastSaved.current = JSON.stringify(toChatbotPayload(profile, extraInstructions, base));
    dispatch({ type: "hydrate", profile, chatbotId: hydrateFrom.id, finished: hydrateFrom.status === "active", accounts });
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
      description,
    });
  };

  const startFromTemplate = (type: BusinessTypeId) =>
    dispatch({ type: "start", profile: createProfile(type, language), suggestion: null, source: "template" });

  // Create the inactive draft as soon as the business type is answered
  // (wireframe delta section 4). A failure is retried once an answer
  // changes the profile.
  const createDraft = create.mutateAsync;
  useEffect(() => {
    if (!state.profile || state.chatbotId || creating.current || !isDraftReady(state)) return;
    const body = toChatbotPayload(state.profile, extraInstructions, base);
    const snapshot = JSON.stringify(body);
    if (snapshot === failed.current) return;
    creating.current = true;
    createDraft({ ...body, status: "inactive" } as ChatbotCreateRequestDto)
      .then((res) => {
        const id = (res as { data?: { data?: { id?: string } } }).data?.data?.id;
        if (!id) throw new Error("missing chatbot id");
        lastSaved.current = snapshot;
        setSaveError(false);
        dispatch({ type: "draftCreated", chatbotId: id });
      })
      .catch(() => {
        failed.current = snapshot;
        setSaveError(true);
      })
      .finally(() => {
        creating.current = false;
      });
  }, [state, extraInstructions, base, createDraft]);

  // After the draft exists, every answer saves the full payload (debounced).
  // No longer serialized against account link/unlink (fix round 3): since
  // `accounts` is always `[]` in this payload, autosave and a link/unlink
  // can never race on it: they're independent mutations now, by
  // construction rather than by timing.
  const save = update.mutateAsync;
  useEffect(() => {
    pending.current = null;
    if (!state.chatbotId || !state.profile) return;
    const body = toChatbotPayload(state.profile, extraInstructions, base);
    const snapshot = JSON.stringify(body);
    if (snapshot === lastSaved.current || snapshot === failed.current) return;
    const id = state.chatbotId;
    pending.current = { id, body, snapshot };
    const timer = setTimeout(() => {
      pending.current = null;
      save({ id, body })
        .then(() => {
          lastSaved.current = snapshot;
          setSaveError(false);
        })
        .catch(() => {
          failed.current = snapshot;
          setSaveError(true);
        });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.chatbotId, state.profile, extraInstructions, base, save]);

  // Leaving the builder sends the answer still waiting on the debounce.
  useEffect(
    () => () => {
      const last = pending.current;
      if (last && last.snapshot !== lastSaved.current) save({ id: last.id, body: last.body }).catch(() => {});
    },
    [save],
  );

  const finish = async () => {
    if (!state.chatbotId) return;
    try {
      await activate.mutateAsync({ id: state.chatbotId, active: true });
      dispatch({ type: "finished" });
    } catch {
      toast.error(t("chatbot.edit.error"));
    }
  };

  return {
    state, dispatch, startFromDescription, startFromTemplate, starting, saveError,
    finish, finishing: activate.isPending, extraInstructions,
  };
}

export type AgentBuilderController = ReturnType<typeof useAgentBuilder>;
