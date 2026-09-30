import { useQueryParams } from "@repo/ui/hooks";
import { CUSTOMER_LIST_PAGE_SIZE } from "../../../../constants";

/** Every URL search param the customer list table reads. */
const CUSTOMER_TABLE_PARAMS = ["page", "search"];

/** Shapes the URL params into the customer list endpoint query. */
export const useCustomerTableQuery = (pageSize = CUSTOMER_LIST_PAGE_SIZE) => {
  const raw = useQueryParams(CUSTOMER_TABLE_PARAMS);
  return {
    raw,
    searchParams: {
      perPage: pageSize,
      page: raw.page ? Number(raw.page) : 1,
      search: raw.search || undefined,
    },
  };
};
