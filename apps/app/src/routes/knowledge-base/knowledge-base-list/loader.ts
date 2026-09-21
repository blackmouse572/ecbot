import {
  knowledgeBaseListQueryOptions,
  knowledgeItemListQueryOptions,
} from "@/hooks/api/knowledge-base";
import { getQueryParamsWithSort } from "@repo/ui/hooks";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import type { LoaderFunctionArgs } from "react-router-dom";
import { KB_QUERY_PARAMS } from "../constants";
import type { KnowledgeBaseResponseDto } from "@repo/client";
import { knowledgeTagListQueryOptions } from "@/hooks/api";

export const knowledgeBaseListLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  // Get the workspace from params
  const workspace = getWorkspaceParams(params);
  const _searchParams = new URL(request.url).searchParams;

  const queryObject = getQueryParamsWithSort(_searchParams, KB_QUERY_PARAMS);

  // Pre-fetch knowledge bases for this workspace
  const kbQuery = knowledgeBaseListQueryOptions(workspace.workspaceSlug);
  const kbList = (await queryClient.ensureQueryData(kbQuery)) as {
    data: KnowledgeBaseResponseDto[];
  };
  const kb = kbList.data[0];

  const query = knowledgeItemListQueryOptions(
    workspace.workspaceSlug,
    kb.id,
    queryObject,
  );

  const tagQuery = knowledgeTagListQueryOptions(workspace.workspaceSlug, kb.id);
  const [_, data] = await Promise.all([
    await queryClient.ensureQueryData(tagQuery),
    queryClient.ensureQueryData(query),
  ]);
  return data;
};
