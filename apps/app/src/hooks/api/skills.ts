import type { BatchResult } from "@/hooks/use-batch-result-toast";
import { queryKeysFactory } from "@/libs/query-factory";
import {
  skillWorkspaceControllerListV1,
  skillWorkspaceControllerGetV1,
  skillWorkspaceControllerCreateV1,
  skillWorkspaceControllerUpdateV1,
  skillWorkspaceControllerBatchDeleteV1,
  skillWorkspaceControllerDeleteV1,
  skillWorkspaceControllerCloneV1,
  chatbotSkillWorkspaceControllerListV1,
  chatbotSkillWorkspaceControllerAttachV1,
  chatbotSkillWorkspaceControllerToggleV1,
  chatbotSkillWorkspaceControllerDetachV1,
  type SkillListResponseDto,
  type SkillGetResponseDto,
  type ChatbotSkillListResponseDto,
  type SkillWorkspaceControllerListV1Response,
  type SkillWorkspaceControllerGetV1Response,
  type CreateSkillRequestDto,
  type UpdateSkillRequestDto,
  type AttachSkillRequestDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// -------------------------------------------------------------------------
// Query key namespaces
// -------------------------------------------------------------------------

export const SKILLS_QUERY_KEY = "skills" as const;
export const skillsQueryKeys = {
  ...queryKeysFactory(SKILLS_QUERY_KEY),
  chatbotSkills: (chatbotId: string) =>
    [SKILLS_QUERY_KEY, "chatbot", chatbotId] as const,
};

export type SkillSource = "workspace" | "template" | "all";

export type SkillListParams = {
  search?: string;
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  source?: SkillSource;
};

// -------------------------------------------------------------------------
// Skill queries
// -------------------------------------------------------------------------

export const skillListQueryOptions = (
  workspace: string,
  params?: SkillListParams,
) =>
  queryOptions({
    queryKey: skillsQueryKeys.list({ workspace, ...params }),
    queryFn: () =>
      skillWorkspaceControllerListV1({
        path: { workspace } as never,
        query: params as A,
      }).then((res) => res.data as A as SkillWorkspaceControllerListV1Response),
    staleTime: 2 * 60 * 1000,
  });

export const skillDetailQueryOptions = (workspace: string, skillId: string) =>
  queryOptions({
    queryKey: skillsQueryKeys.detail(skillId),
    queryFn: () =>
      skillWorkspaceControllerGetV1({
        path: { workspace, skillId } as A,
      }).then((res) => res.data as A as SkillWorkspaceControllerGetV1Response),
    staleTime: 5 * 60 * 1000,
  });

export const useListSkills = (
  workspace: string,
  params?: SkillListParams,
  options?: { enabled?: boolean },
) => {
  const { data, isError, error, ...rest } = useQuery({
    ...skillListQueryOptions(workspace, params),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    skills: data?.data as SkillListResponseDto[] | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useGetSkill = (
  workspace: string,
  skillId: string,
  options?: { enabled?: boolean },
) => {
  const { data, isError, error, ...rest } = useQuery({
    ...skillDetailQueryOptions(workspace, skillId),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    skill: data?.data as SkillGetResponseDto | undefined,
  };
};

// -------------------------------------------------------------------------
// Skill mutations
// -------------------------------------------------------------------------

export const useCreateSkill = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["create-skill"] as const,
    mutationFn: (body: CreateSkillRequestDto) =>
      skillWorkspaceControllerCreateV1({
        path: { workspace } as never,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsQueryKeys.lists() });
    },
  });

  return { createSkill: mutateAsync, ...rest };
};

export const useUpdateSkill = (workspace: string, skillId: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["update-skill", skillId] as const,
    mutationFn: (body: UpdateSkillRequestDto) =>
      skillWorkspaceControllerUpdateV1({
        path: { workspace, skillId } as A,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillsQueryKeys.detail(skillId),
      });
      queryClient.invalidateQueries({ queryKey: skillsQueryKeys.lists() });
    },
  });

  return { updateSkill: mutateAsync, ...rest };
};

export const useBatchDeleteSkills = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation<BatchResult, Error, string[]>({
    mutationKey: ["batch-delete-skills"] as const,
    mutationFn: (ids: string[]) =>
      skillWorkspaceControllerBatchDeleteV1({
        path: { workspace } as A,
        body: { ids },
      }).then((res) => (res.data as A)?.data as BatchResult),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsQueryKeys.lists() });
    },
  });

  return { batchDeleteSkills: mutateAsync, ...rest };
};

export const useDeleteSkill = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["delete-skill"] as const,
    mutationFn: (skillId: string) =>
      skillWorkspaceControllerDeleteV1({
        path: { workspace, skillId } as A,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsQueryKeys.lists() });
    },
  });

  return { deleteSkill: mutateAsync, ...rest };
};

// Clone a builtin template into an editable workspace-owned skill.
export const useCloneSkill = (workspace: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["clone-skill"] as const,
    mutationFn: (skillId: string) =>
      skillWorkspaceControllerCloneV1({
        path: { workspace, skillId } as A,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsQueryKeys.lists() });
    },
  });

  return { cloneSkill: mutateAsync, ...rest };
};

// -------------------------------------------------------------------------
// Chatbot <-> Skill wiring
// -------------------------------------------------------------------------

export const chatbotSkillsQueryOptions = (
  workspace: string,
  chatbotId: string,
) =>
  queryOptions({
    queryKey: skillsQueryKeys.chatbotSkills(chatbotId),
    queryFn: () =>
      chatbotSkillWorkspaceControllerListV1({
        path: { workspace, chatbotId } as A,
      }).then((res) => res.data as A),
    staleTime: 60 * 1000,
  });

export const useChatbotSkills = (
  workspace: string,
  chatbotId: string,
  options?: { enabled?: boolean },
) => {
  const { data, isError, error, ...rest } = useQuery({
    ...chatbotSkillsQueryOptions(workspace, chatbotId),
    ...options,
  });

  return {
    ...rest,
    isError,
    error,
    chatbotSkills: (data?.data ?? []) as ChatbotSkillListResponseDto[],
  };
};

export const useAttachSkillToChatbot = (
  workspace: string,
  chatbotId: string,
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["attach-skill-to-chatbot", chatbotId] as const,
    mutationFn: ({
      skillId,
      body,
    }: {
      skillId: string;
      body?: AttachSkillRequestDto;
    }) =>
      chatbotSkillWorkspaceControllerAttachV1({
        path: { workspace, chatbotId, skillId } as A,
        body: (body ?? {}) as AttachSkillRequestDto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillsQueryKeys.chatbotSkills(chatbotId),
      });
    },
  });

  return { attachSkillToChatbot: mutateAsync, ...rest };
};

export const useToggleSkillOnChatbot = (
  workspace: string,
  chatbotId: string,
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["toggle-skill-on-chatbot", chatbotId] as const,
    mutationFn: ({ skillId, enabled }: { skillId: string; enabled: boolean }) =>
      chatbotSkillWorkspaceControllerToggleV1({
        path: { workspace, chatbotId, skillId } as A,
        body: { enabled } as AttachSkillRequestDto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillsQueryKeys.chatbotSkills(chatbotId),
      });
    },
  });

  return { toggleSkillOnChatbot: mutateAsync, ...rest };
};

export const useDetachSkillFromChatbot = (
  workspace: string,
  chatbotId: string,
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationKey: ["detach-skill-from-chatbot", chatbotId] as const,
    mutationFn: (skillId: string) =>
      chatbotSkillWorkspaceControllerDetachV1({
        path: { workspace, chatbotId, skillId } as A,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillsQueryKeys.chatbotSkills(chatbotId),
      });
    },
  });

  return { detachSkillFromChatbot: mutateAsync, ...rest };
};
