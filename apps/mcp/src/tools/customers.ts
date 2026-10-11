import type { McpServer } from "@modelcontextprotocol/server";
import {
  customerClientControllerGetV1,
  customerClientControllerListV1,
} from "@repo/client";
import * as z from "zod";
import { type Allows, type ApiOptions, paging, respond } from "./shared";

export function registerCustomerTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (!allows("CUSTOMER", "read")) return;

  server.registerTool(
    "list_customers",
    {
      title: "List customers",
      description:
        "List the workspace's customers, newest first: the people who have messaged it on any channel.",
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe("Match on the name, phone or email."),
        ...paging,
      }),
      annotations: { readOnlyHint: true },
    },
    (query) =>
      respond(customerClientControllerListV1({ ...api, query }), (d) => ({
        customers: d.data,
        pagination: d._metadata.pagination,
      })),
  );

  server.registerTool(
    "get_customer",
    {
      title: "Get customer",
      description: "Get a customer's profile.",
      inputSchema: z.object({ id: z.string() }),
      annotations: { readOnlyHint: true },
    },
    ({ id }) =>
      respond(
        customerClientControllerGetV1({ ...api, path: { id } }),
        (d) => d.data,
      ),
  );
}
