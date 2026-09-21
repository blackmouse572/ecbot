import { useQueryParams } from "@repo/ui/hooks";
import { FOLLOWUP_QUERY_PARAMS } from "../../../../constants";

type UseFollowupsTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useFollowupsTableQuery = ({
  prefix,
  pageSize = 20,
}: UseFollowupsTableQueryProps) => {
  const queryObject = useQueryParams(FOLLOWUP_QUERY_PARAMS, prefix);

  const { chatbot, search, status, page } = queryObject;

  const searchParams = {
    perPage: pageSize,
    page: page ? Number(page) : 1,
    chatbot: chatbot || undefined,
    search: search || undefined,
    status: status || undefined,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
