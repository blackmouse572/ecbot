import { queryKeysFactory } from "@/libs/query-factory";
import {
  useLastWorkspaceSlug,
  useSetLastWorkspaceSlug,
} from "@/modules/workspace";
import {
  workspaceControllerCreateWorkSpaceV1,
  workspaceControllerDeleteWorkSpaceV1,
  workspaceControllerDetailsV1,
  // workspaceControllerDetailsV1,
  workspaceControllerGetListWorkSpaceV1,
  workspaceControllerUpdateWorkSpaceV1,
  type WorkspaceControllerDetailsV1Response,
  type WorkspaceControllerGetListWorkSpaceV1Response,
  type WorkSpaceCreateRequestDto,
  type WorkSpaceGetResponseDto,
  type WorkSpaceUpdateRequestDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWorkspaceParams } from "../use-workspace-params";

export const workspaceQueryKeys = queryKeysFactory("workspace");

export const workspaceListQueryOptions = queryOptions({
  queryKey: workspaceQueryKeys.list(),
  queryFn: async () => {
    const response = await workspaceControllerGetListWorkSpaceV1();
    const workspaces =
      response.data as unknown as WorkspaceControllerGetListWorkSpaceV1Response;
    return workspaces.data as WorkSpaceGetResponseDto[];
  },
  staleTime: 0,
});

export function useWorkspaceList(
  options?: Partial<typeof workspaceListQueryOptions>,
) {
  const { data, isLoading, error, ...rest } = useQuery({
    ...workspaceListQueryOptions,
    ...options,
  });

  return {
    workspaces: data || [],
    isLoading,
    error,
    ...rest,
  };
}

export const workspaceDetailsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: workspaceQueryKeys.detail(id),
    queryFn: async () => {
      const response = (await workspaceControllerDetailsV1({
        path: { workspace: id },
      }).then((res) => res.data)) as WorkspaceControllerDetailsV1Response;
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // An unknown slug must fail fast — useEnsureWorkspace waits for this query
    // to settle before redirecting to a valid workspace.
    retry: false,
  });

/**
 * Workspace to land on when the URL has no slug: the last visited one while it
 * is still accessible, otherwise the first workspace.
 */
export function resolveWorkspaceSlug(
  workspaces: WorkSpaceGetResponseDto[],
  lastSlug: string | null,
): string | undefined {
  const lastWorkspace = workspaces.find((w) => w.slug === lastSlug);
  return lastWorkspace?.slug ?? workspaces[0]?.slug;
}

export function useResolvedWorkspaceSlug() {
  const { workspaces, isLoading } = useWorkspaceList();
  const lastSlug = useLastWorkspaceSlug();

  return { slug: resolveWorkspaceSlug(workspaces, lastSlug), isLoading };
}

export function useWorkspace() {
  const go = useNavigate();
  const location = useLocation();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  // Fetch specific workspace details
  const { data, ...rest } = useQuery({
    ...workspaceDetailsQueryOptions(workspaceSlug || ""),
    enabled: !!workspaceSlug,
  });

  // Navigate to another workspace
  const navigateToWorkspace = useCallback(
    (slug: string) => {
      const path = location.pathname;
      const newPath = workspaceSlug
        ? path.replace(`/${workspaceSlug}/`, `/${slug}/`)
        : `/${slug}${path}`;

      go(newPath);
    },
    [location.pathname, workspaceSlug, go],
  );

  return {
    workspace: data,
    data,
    navigateToWorkspace,
    ...rest,
  };
}

// Context provider for workspace
export function useEnsureWorkspace() {
  const { workspaces, isLoading: isLoadingWorkspaces } = useWorkspaceList();
  const { workspace, isLoading: isLoadingWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const location = useLocation();
  const lastSlug = useLastWorkspaceSlug();
  const setLastWorkspaceSlug = useSetLastWorkspaceSlug();

  // Remember the workspace in the URL — whether it came from the sidebar
  // switcher or from the user typing a workspace link directly.
  useEffect(() => {
    if (workspaceSlug && workspaces.some((w) => w.slug === workspaceSlug)) {
      setLastWorkspaceSlug(workspaceSlug);
    }
  }, [workspaceSlug, workspaces, setLastWorkspaceSlug]);

  useEffect(() => {
    // Skip if still loading
    if (isLoadingWorkspaces || isLoadingWorkspace) {
      return;
    }

    // If we have workspaces but no current workspace in URL, redirect to the first workspace
    if (workspaces.length > 0 && !workspaceSlug) {
      const firstWorkspace = workspaces[0];
      navigate(`/${firstWorkspace.slug}${location.pathname}`);
      return;
    }

    // If the workspaceSlug is invalid, redirect to the resolved workspace
    if (
      workspaces.length > 0 &&
      workspaceSlug &&
      !workspaces.some((w) => w.slug === workspaceSlug)
    ) {
      const fallbackSlug = resolveWorkspaceSlug(workspaces, lastSlug);
      // Preserve path after invalid workspace slug (keeps its leading slash)
      const path = location.pathname.substring(workspaceSlug.length + 1);
      navigate(`/${fallbackSlug}${path}`, { replace: true });
    }
  }, [
    workspaces,
    isLoadingWorkspaces,
    isLoadingWorkspace,
    workspaceSlug,
    lastSlug,
    navigate,
    location,
  ]);

  return {
    workspace,
    isLoading: isLoadingWorkspaces || isLoadingWorkspace,
    hasWorkspaces: workspaces.length > 0,
  };
}

export function useCreateWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: WorkSpaceCreateRequestDto) => {
      return workspaceControllerCreateWorkSpaceV1({
        body,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: workspaceQueryKeys.list(),
      });
    },
    onError: (error) => {
      if ("status" in error && error.status === 409) {
        client.invalidateQueries();
      }
    },
  });
}

export function useEditWorkspace() {
  const client = useQueryClient();
  const { workspaceSlug } = useWorkspaceParams();
  return useMutation({
    mutationFn: async (body: WorkSpaceUpdateRequestDto) => {
      return workspaceControllerUpdateWorkSpaceV1({
        body: body,
        path: {
          workspace: workspaceSlug,
        },
      });
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: workspaceQueryKeys.detail(workspaceSlug),
      });
    },
    onError: (error) => {
      if ("status" in error && error.status === 409) {
        client.invalidateQueries();
      }
    },
  });
}

export function useDeleteWorkspace() {
  const client = useQueryClient();
  const { workspaceSlug } = useWorkspaceParams();
  return useMutation({
    mutationFn: async () => {
      return workspaceControllerDeleteWorkSpaceV1({
        path: { workspace: workspaceSlug },
      });
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: workspaceQueryKeys.list(),
      });
    },
  });
}
