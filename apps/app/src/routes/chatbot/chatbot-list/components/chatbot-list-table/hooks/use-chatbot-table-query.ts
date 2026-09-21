import { useQueryParams, type QueryParams } from "@repo/ui/hooks";
import { CHATBOT_CONSTANTS } from "../../../../constants";

/** Facet params the chatbot table drives from its filter chips. */
const FACETS = ["status", "type", "account"];

/** Every URL search param the chatbot list table reads. */
export const CHATBOT_TABLE_PARAMS = ["page", "perPage", "search", ...FACETS];

/** Shapes raw URL params into the chatbot list endpoint query. */
export const toChatbotListQuery = (
  urlParams: QueryParams<string>,
  perPage: number,
) => ({
  raw: urlParams,
  searchParams: {
    perPage,
    page: urlParams.page ? Number(urlParams.page) : 1,
    status: urlParams.status?.split(","),
    type: urlParams.type?.split(","),
    account: urlParams.account || undefined,
    search: urlParams.search || undefined,
  },
});

export const useChatbotTableQuery = (
  perPage = CHATBOT_CONSTANTS.PAGE_SIZE,
  prefix?: string,
) => toChatbotListQuery(useQueryParams(CHATBOT_TABLE_PARAMS, prefix), perPage);
