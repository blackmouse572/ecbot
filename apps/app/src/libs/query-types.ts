import { type ResponsePagingMetadataPaginationRequestDto } from "@repo/client";
export type RequestPaginationDto = Pick<
  ResponsePagingMetadataPaginationRequestDto,
  "page" | "perPage" | "search" | "orderBy" | "orderDirection"
>;
