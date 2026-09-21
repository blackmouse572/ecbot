import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import {
  type ChatbotControllerFindOneV1Responses,
  chatbotControllerFindOneV1,
} from "@repo/client";
import type { LoaderFunctionArgs } from "react-router-dom";

const chatbotDetailsQuery = (id: string) => ({
  queryKey: ["chatbot", "detail", id],
  queryFn: async (workspace: string) =>
    chatbotControllerFindOneV1({
      path: { workspace, id },
    }).then((res) => res.data),
});

export const chatbotDetailsLoader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  if (!id) throw new Error("Chatbot ID is required");

  const query = chatbotDetailsQuery(id);
  const workspace = getWorkspaceParams(params);
  const data = queryClient.getQueryData<
    ChatbotControllerFindOneV1Responses["200"]
  >(query.queryKey);

  return (
    data ??
    queryClient.fetchQuery({
      queryKey: query.queryKey,
      queryFn: () => query.queryFn(workspace.workspaceSlug),
    })
  );
};
