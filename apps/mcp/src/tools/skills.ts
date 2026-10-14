import type { McpServer } from "@modelcontextprotocol/server";
import {
  chatbotSkillClientControllerAttachV1,
  chatbotSkillClientControllerDetachV1,
  chatbotSkillClientControllerListV1,
  skillClientControllerCloneV1,
  skillClientControllerCreateV1,
  skillClientControllerDeleteV1,
  skillClientControllerGetV1,
  skillClientControllerListV1,
  skillClientControllerUpdateV1,
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

// A Skill is know-how a chatbot loads when a request needs it, e.g. how to
// handle a refund with the tools it has: free markdown, or structured steps.

// The API validates the step tree; this only tells the caller its shape.
const steps = z
  .array(z.record(z.string(), z.unknown()))
  .describe(
    "For format STEPS: the steps in order. Each has a unique id and a type: ask {text}, say {text: exact words}, tell {text}, tool {toolId, action? (MCP tools), text?: how to use it}, if {branches: [{id, condition, steps}], otherwise?: steps}. Tools must be workspace tools.",
  );
const guardrails = z
  .array(z.string().max(500))
  .max(20)
  .describe("Rules the chatbot always follows while using the Skill.");
const format = z
  .enum(["CONTENT", "STEPS"])
  .describe(
    "CONTENT (default): markdown in instructions. STEPS: structured steps.",
  );

export function registerSkillTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (allows("SKILL", "read")) registerReadTools(server, api);
  if (allows("SKILL", "create")) registerCreateTools(server, api);
  if (allows("SKILL", "update")) registerUpdateTools(server, api);
  if (allows("SKILL", "delete")) registerDeleteTools(server, api);
}

function registerReadTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "list_skills",
    {
      title: "List skills",
      description:
        "List the workspace's Skills: instructions a chatbot loads when a request needs them. Pass source template for the builtin ones you can clone.",
      inputSchema: z.object({
        search: z.string().optional(),
        source: z.enum(["workspace", "template", "all"]).optional(),
        ...paging,
      }),
      annotations: READS,
    },
    (query) =>
      respond(skillClientControllerListV1({ ...api, query }), (d) => ({
        skills: d.data,
        pagination: d._metadata.pagination,
      })),
  );

  server.registerTool(
    "get_skill",
    {
      title: "Get skill",
      description: "Get a Skill with its instructions.",
      inputSchema: z.object({ skillId: z.string() }),
      annotations: READS,
    },
    ({ skillId }) =>
      respond(
        skillClientControllerGetV1({ ...api, path: { skillId } }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "list_chatbot_skills",
    {
      title: "List a chatbot's skills",
      description: "List the Skills a chatbot can load.",
      inputSchema: z.object({ chatbotId: z.string() }),
      annotations: READS,
    },
    ({ chatbotId }) =>
      respond(
        chatbotSkillClientControllerListV1({ ...api, path: { chatbotId } }),
        (d) => d.data,
      ),
  );
}

function registerCreateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "create_skill",
    {
      title: "Create skill",
      description:
        "Write a Skill. Then give it to a chatbot with attach_skill.",
      inputSchema: z.object({
        name: z.string().max(150),
        description: z
          .string()
          .max(500)
          .optional()
          .describe(
            "When to use it: the chatbot sees this until it loads the Skill.",
          ),
        format: format.optional(),
        instructions: z
          .string()
          .optional()
          .describe("The Skill itself, in markdown. Required for CONTENT."),
        steps: steps.optional(),
        guardrails: guardrails.optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      }),
      annotations: ADDS,
    },
    (body) =>
      respond(skillClientControllerCreateV1({ ...api, body }), (d) => d.data),
  );

  server.registerTool(
    "clone_skill_template",
    {
      title: "Clone skill template",
      description:
        "Copy a builtin Skill template (list_skills with source template) into the workspace, where it can be edited and attached.",
      inputSchema: z.object({ templateId: z.string() }),
      annotations: ADDS,
    },
    ({ templateId }) =>
      respond(
        skillClientControllerCloneV1({ ...api, path: { skillId: templateId } }),
        (d) => d.data,
      ),
  );
}

function registerUpdateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "update_skill",
    {
      title: "Update skill",
      description: "Change a Skill. Only the fields you send change.",
      inputSchema: z.object({
        skillId: z.string(),
        name: z.string().max(150).optional(),
        description: z.string().max(500).optional(),
        format: format.optional(),
        instructions: z.string().optional(),
        steps: steps.optional(),
        guardrails: guardrails.optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      }),
      annotations: OVERWRITES,
    },
    ({ skillId, ...body }) =>
      respond(
        skillClientControllerUpdateV1({ ...api, path: { skillId }, body }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "attach_skill",
    {
      title: "Give a chatbot a skill",
      description:
        "Let a chatbot load a workspace Skill. Clone a template first to attach it.",
      inputSchema: z.object({
        chatbotId: z.string(),
        skillId: z.string(),
        enabled: z.boolean().optional(),
      }),
      annotations: SWITCHES,
    },
    ({ chatbotId, skillId, ...body }) =>
      respond(
        chatbotSkillClientControllerAttachV1({
          ...api,
          path: { chatbotId, skillId },
          body,
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "detach_skill",
    {
      title: "Take a skill from a chatbot",
      description: "Stop a chatbot loading a Skill. The Skill itself stays.",
      inputSchema: z.object({ chatbotId: z.string(), skillId: z.string() }),
      annotations: SWITCHES,
    },
    ({ chatbotId, skillId }) =>
      respond(
        chatbotSkillClientControllerDetachV1({
          ...api,
          path: { chatbotId, skillId },
        }),
        (d) => d.data,
      ),
  );
}

function registerDeleteTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "delete_skill",
    {
      title: "Delete skill",
      description:
        "Delete a workspace Skill. Chatbots that had it can no longer load it.",
      inputSchema: z.object({ skillId: z.string() }),
      annotations: DELETES,
    },
    ({ skillId }) =>
      respond(
        skillClientControllerDeleteV1({ ...api, path: { skillId } }),
        (d) => d.data,
      ),
  );
}
