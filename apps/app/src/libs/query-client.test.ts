import { describe, expect, it } from "vitest";
import queryClient from "./query-client";

const suspended = {
  response: { status: 403, data: { statusCode: 5215, message: "x" } },
};

describe("queryClient", () => {
  it("marks the cached workspace stale when any call answers that it is suspended", async () => {
    const detailKey = ["workspace", "detail", "shop", { query: undefined }];
    queryClient.setQueryData(detailKey, { id: "w1", slug: "shop" });

    await queryClient
      .fetchQuery({
        queryKey: ["conversation", "list"],
        queryFn: () => Promise.reject(suspended),
      })
      .catch(() => undefined);

    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
  });

  it("leaves the workspace cache alone for other errors", async () => {
    const detailKey = ["workspace", "detail", "other", { query: undefined }];
    queryClient.setQueryData(detailKey, { id: "w2", slug: "other" });

    await queryClient
      .fetchQuery({
        queryKey: ["conversation", "other"],
        queryFn: () =>
          Promise.reject({
            response: { status: 403, data: { statusCode: 1 } },
          }),
      })
      .catch(() => undefined);

    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(false);
  });
});
