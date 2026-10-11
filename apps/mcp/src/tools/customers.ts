import type { McpServer } from "@modelcontextprotocol/server";
import {
  type CustomerTagCreateRequestDto,
  type CustomerUpdateRequestDto,
  customerClientControllerGetV1,
  customerClientControllerListV1,
  customerClientControllerUpdateV1,
  customerTagAssignmentClientControllerApplyV1,
  customerTagAssignmentClientControllerListV1,
  customerTagAssignmentClientControllerRemoveV1,
  customerTagClientControllerCreateV1,
  customerTagClientControllerDeleteV1,
  customerTagClientControllerListV1,
  customerTagClientControllerUpdateV1,
} from "@repo/client";
import * as z from "zod";
import {
  ADDS,
  type Allows,
  type ApiOptions,
  DELETES,
  OVERWRITES,
  READS,
  SWITCHES,
  paging,
  respond,
} from "./shared";

// The generated client types these nullable strings as objects (their
// DTOs document nullable without a type), so the bodies below are cast.
const tagFields = {
  emoji: z.string().max(16).optional(),
  description: z
    .string()
    .max(2000)
    .optional()
    .describe("What the tag means, so the team and the AI apply it right."),
  triggersHandoff: z
    .boolean()
    .optional()
    .describe(
      "If true, the chatbot hands the conversation to the team when it applies this tag during a conversation.",
    ),
};

export function registerCustomerTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (allows("CUSTOMER", "read")) registerReadTools(server, api);
  if (allows("CUSTOMER", "create")) registerCreateTools(server, api);
  if (allows("CUSTOMER", "update")) registerUpdateTools(server, api);
  if (allows("CUSTOMER", "delete")) registerDeleteTools(server, api);
}

function registerReadTools(server: McpServer, api: ApiOptions) {
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
      annotations: READS,
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
      description:
        "Get a customer's profile. Use get_customer_tags for their tags.",
      inputSchema: z.object({ id: z.string() }),
      annotations: READS,
    },
    ({ id }) =>
      respond(
        customerClientControllerGetV1({ ...api, path: { id } }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "list_customer_tags",
    {
      title: "List customer tags",
      description: "List the tags the workspace uses to sort its customers.",
      inputSchema: z.object({}),
      annotations: READS,
    },
    () => respond(customerTagClientControllerListV1({ ...api }), (d) => d.data),
  );

  server.registerTool(
    "get_customer_tags",
    {
      title: "Get a customer's tags",
      description: "List the tags on one customer.",
      inputSchema: z.object({ customerId: z.string() }),
      annotations: READS,
    },
    ({ customerId }) =>
      respond(
        customerTagAssignmentClientControllerListV1({
          ...api,
          path: { customerId },
        }),
        (d) => d.data,
      ),
  );
}

function registerCreateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "create_customer_tag",
    {
      title: "Create customer tag",
      description: "Create a tag for sorting customers, e.g. VIP or Wholesale.",
      inputSchema: z.object({ name: z.string().min(1).max(64), ...tagFields }),
      annotations: ADDS,
    },
    (body) =>
      respond(
        customerTagClientControllerCreateV1({
          ...api,
          body: body as CustomerTagCreateRequestDto,
        }),
        (d) => d.data,
      ),
  );
}

function registerUpdateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "update_customer",
    {
      title: "Update customer",
      description:
        "Change a customer's profile. Only the fields you send change.",
      inputSchema: z.object({
        customerId: z.string(),
        name: z.string().max(255).optional(),
        phone: z.string().max(50).optional(),
        email: z.string().email().max(255).optional(),
        language: z.string().max(10).optional(),
        notes: z.string().max(5000).optional(),
        profileSummary: z.string().max(5000).optional(),
      }),
      annotations: OVERWRITES,
    },
    ({ customerId, ...body }) =>
      respond(
        customerClientControllerUpdateV1({
          ...api,
          path: { id: customerId },
          body: body as CustomerUpdateRequestDto,
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "update_customer_tag",
    {
      title: "Update customer tag",
      description: "Rename a customer tag or change its settings.",
      inputSchema: z.object({
        tagId: z.string(),
        name: z.string().min(1).max(64).optional(),
        ...tagFields,
      }),
      annotations: OVERWRITES,
    },
    ({ tagId, ...body }) =>
      respond(
        customerTagClientControllerUpdateV1({
          ...api,
          path: { customerTag: tagId },
          body: body as CustomerTagCreateRequestDto,
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "tag_customer",
    {
      title: "Tag a customer",
      description: "Put a tag on a customer.",
      inputSchema: z.object({ customerId: z.string(), tagId: z.string() }),
      annotations: SWITCHES,
    },
    ({ customerId, tagId }) =>
      respond(
        customerTagAssignmentClientControllerApplyV1({
          ...api,
          path: { customerId, tagId },
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "untag_customer",
    {
      title: "Untag a customer",
      description: "Take a tag off a customer.",
      inputSchema: z.object({ customerId: z.string(), tagId: z.string() }),
      annotations: SWITCHES,
    },
    ({ customerId, tagId }) =>
      respond(
        customerTagAssignmentClientControllerRemoveV1({
          ...api,
          path: { customerId, tagId },
        }),
        () => ({ removed: tagId }),
      ),
  );
}

function registerDeleteTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "delete_customer_tag",
    {
      title: "Delete customer tag",
      description: "Delete a customer tag. It comes off every customer.",
      inputSchema: z.object({ tagId: z.string() }),
      annotations: DELETES,
    },
    ({ tagId }) =>
      respond(
        customerTagClientControllerDeleteV1({
          ...api,
          path: { customerTag: tagId },
        }),
        () => ({ deleted: tagId }),
      ),
  );
}
