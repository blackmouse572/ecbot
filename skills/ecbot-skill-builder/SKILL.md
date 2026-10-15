---
name: ecbot-skill-builder
description: "Turn a business requirement or a workflow into an Ecbot Skill written as steps (Ask, Say, Tell, Tool, If) with guardrails, through the Ecbot MCP Server. Use when the user describes how they handle a kind of customer request, or asks to create or improve an Ecbot skill."
---

# Write an Ecbot skill

Read the `ecbot` skill first for the safety rules. A full walkthrough with an example is at https://ecbot.dev/en/docs/cookbook/tutorial

## 1. Look before you write

- `list_skills` with `source: template`: if a template fits, clone it (`clone_skill_template`) and edit it instead of starting over.
- `list_skills`: do not create a second skill for a request an existing one covers.
- `list_workspace_tools` and `list_customer_tags`: the steps must point at tools and tags that exist. For an MCP tool, `get_workspace_tool` lists its actions.

## 2. Read the requirement once per part

| Question                                                            | Becomes                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| When does the customer start this request?                          | `description` ("When to use"), in the customer's words             |
| What do we need to know from them?                                  | one **ask** step each                                              |
| What must we tell them?                                             | **tell** (own words) or **say** (word for word, e.g. bank details) |
| Where does it depend on something ("if", "only", "over", "unless")? | **if** with branches and `otherwise`                               |
| What must happen in a system?                                       | **tool** steps                                                     |
| What must never happen ("never", "always", "don't")?                | `guardrails`, not steps                                            |

One skill per kind of request. If the requirement covers booking and cancelling, write two skills.

## 3. Write the steps

Use `format: "STEPS"`. Every step and branch needs an `id` unique in the skill. Ifs nest at most 3 deep.

```json
{
  "name": "Order status",
  "description": "Use when the customer asks where their order is or when it will arrive.",
  "format": "STEPS",
  "guardrails": [
    "Never make up a delivery date. Only use what the tool returns."
  ],
  "steps": [
    { "id": "code", "type": "ask", "text": "The order code." },
    {
      "id": "lookup",
      "type": "tool",
      "toolId": "<workspace tool id>",
      "text": "With the order code."
    },
    {
      "id": "late",
      "type": "if",
      "branches": [
        {
          "id": "late-yes",
          "condition": "The order is late or lost.",
          "steps": [
            {
              "id": "sorry",
              "type": "say",
              "text": "Sorry for the wait, I'm passing this to our team right now."
            },
            { "id": "handoff", "type": "tool", "toolId": "system:handoff" }
          ]
        }
      ],
      "otherwise": [
        {
          "id": "status",
          "type": "tell",
          "text": "The status and the expected delivery date."
        }
      ]
    }
  ]
}
```

Built-in actions every agent has, used as a tool step's `toolId`:

| toolId                                | Does                                      | `action`                      |
| ------------------------------------- | ----------------------------------------- | ----------------------------- |
| `system:handoff`                      | hands the chat to staff, the agent pauses | none                          |
| `system:notify_team`                  | alerts staff, the agent keeps helping     | none                          |
| `system:add_tag`, `system:remove_tag` | tags the customer                         | the tag name                  |
| `system:schedule_followup`            | messages the customer again later         | none                          |
| `system:save_customer_field`          | saves a detail the customer gave          | the field name, e.g. `budget` |

A workspace MCP tool also needs `action`: one of its discovered actions.

## 4. Confirm, create, attach

1. Show the user the skill as a numbered list (name, When to use, steps, guardrails) and wait for their OK.
2. `create_skill` (or `update_skill`). If the API rejects the steps, fix what it names and try again.
3. `attach_skill` to the agent the user names, and `enable_chatbot_tool` for any workspace tool the steps use.
4. If the agent's `extraInstructions` still describes this workflow, offer to remove it there (see `ecbot-agent-builder`).
5. Tell the user to try the request in the app's test chat, including each branch.
