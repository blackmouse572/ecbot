import { queryKeysFactory } from "@/libs/query-factory";
import {
  clientCredentialWorkspaceControllerCreateV1,
  clientCredentialWorkspaceControllerDeleteV1,
  clientCredentialWorkspaceControllerListV1,
  clientCredentialWorkspaceControllerRotateV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useResolvedWorkspaceSlug } from "./workspace";

export const CLIENT_CREDENTIAL_QUERY_KEY = "client-credential" as const;

export type ClientCredentialGetResponseDto = {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type ClientCredentialCreateRequestDto = {
  name: string;
  startDate?: string;
  endDate?: string;
};

// Returned once at creation — secret is never recoverable afterwards.
export type ClientCredentialCreateResponseDto = {
  id: string;
  key: string;
  secret: string;
};

export const clientCredentialQueryKeys = {
  ...queryKeysFactory<typeof CLIENT_CREDENTIAL_QUERY_KEY>(
    CLIENT_CREDENTIAL_QUERY_KEY,
  ),
};

export const useClientCredentialList = () => {
  const { slug, isLoading: isLoadingWorkspace } = useResolvedWorkspaceSlug();

  const { data, isLoading, ...rest } = useQuery({
    queryKey: clientCredentialQueryKeys.list(),
    enabled: !!slug,
    queryFn: () =>
      clientCredentialWorkspaceControllerListV1({
        path: {
          workspace: slug!,
        },
      }).then(
        (res) =>
          ((res.data as A)?.data as ClientCredentialGetResponseDto[]) ?? [],
      ),
  });

  return {
    ...rest,
    isLoading: isLoading || isLoadingWorkspace,
    credentials: (data as ClientCredentialGetResponseDto[] | undefined) ?? [],
  };
};

export const useCreateClientCredential = () => {
  const { slug } = useResolvedWorkspaceSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ClientCredentialCreateRequestDto) => {
      // Settings pages are not nested under a :workspaceSlug route — refuse to
      // fire a request with an unresolved {workspace} path param.
      if (!slug) {
        throw new Error("Workspace is not resolved yet");
      }
      return clientCredentialWorkspaceControllerCreateV1({
        path: { workspace: slug },
        body,
      }).then(
        (res) => (res.data as A)?.data as ClientCredentialCreateResponseDto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientCredentialQueryKeys.lists(),
      });
    },
  });
};

/**
 * Issue a new secret for an existing credential. The public key is unchanged, so
 * the third party updates one value rather than re-registering; the previous
 * secret stops working immediately. Like create, the secret comes back once and
 * is never recoverable afterwards (ADR-0012).
 */
export const useRotateClientCredential = () => {
  const { slug } = useResolvedWorkspaceSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!slug) {
        throw new Error("Workspace is not resolved yet");
      }
      return clientCredentialWorkspaceControllerRotateV1({
        path: { workspace: slug, id },
      }).then(
        (res) => (res.data as A)?.data as ClientCredentialCreateResponseDto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientCredentialQueryKeys.lists(),
      });
    },
  });
};

export const useDeleteClientCredential = () => {
  const { slug } = useResolvedWorkspaceSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!slug) {
        throw new Error("Workspace is not resolved yet");
      }
      return clientCredentialWorkspaceControllerDeleteV1({
        path: { workspace: slug, id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientCredentialQueryKeys.lists(),
      });
    },
  });
};
