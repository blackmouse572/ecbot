import { chatbotListQuery } from "@/hooks/api/chatbot";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import { type ChatbotControllerFindAllV1Responses } from "@repo/client";
import type { LoaderFunctionArgs } from "react-router-dom";

export const chatbotLoader = async ({ params }: LoaderFunctionArgs) => {
  const query = chatbotListQuery();
  const workspace = getWorkspaceParams(params);
  const data = queryClient.getQueryData<
    ChatbotControllerFindAllV1Responses["200"]
  >(query.queryKey);
  return (
    data ??
    queryClient.fetchQuery({
      queryKey: query.queryKey,
      queryFn: () => query.queryFn(workspace.workspaceSlug),
    })
  );
};
