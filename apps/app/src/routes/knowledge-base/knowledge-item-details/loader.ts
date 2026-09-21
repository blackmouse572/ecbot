import type { LoaderFunctionArgs } from "react-router-dom";
import { knowledgeItemDetailQueryOptions } from "../../../hooks/api";
import queryClient from "../../../libs/query-client";

export async function knowledgeItemDetailsLoader({
  params,
}: LoaderFunctionArgs) {
  const { id, knowledgeBaseId, workspaceSlug } = params;

  const query = knowledgeItemDetailQueryOptions(
    workspaceSlug!,
    knowledgeBaseId!,
    id!,
  );
  return queryClient.ensureQueryData(query);
}
