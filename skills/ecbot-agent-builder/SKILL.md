---
name: ecbot-agent-builder
description: "Set up or clean up an Ecbot agent (chatbot) through the Ecbot MCP Server: answer its profile, keep extraInstructions short, move facts to knowledge and every workflow into Skills. Use when creating an agent, when an agent's instructions are long, or when it skips steps of a procedure."
---

# Build an Ecbot agent

Read the `ecbot` skill first for the safety rules.

## The rule

The agent's prompt is compiled from its `profile`: the same answers the Ecbot agent builder asks (goals, personality, formality, address style, rules, facts, what to collect, when to hand over). Set those there, with the ids the tool schema lists. `extraInstructions` is added after the compiled prompt, for what the profile can't say.

`extraInstructions` is in every reply the agent writes. Put only a few rules there that apply to every reply and that the profile has no answer for. Each workflow ("when a customer wants to book, ask the service, then the time, then...") becomes its own **Skill**, which the agent loads only when that request comes up.

Why: long instructions with many workflows dilute each other, so the agent skips steps or mixes procedures. A Skill has its own "When to use", steps, branches and guardrails, can be tested on its own, and can be reused by other agents.

## Set up a new agent

1. Ask what the business is, who the customers are, and the channels. Pick `type` and `primaryLanguage`; pick `modelTextName` from `list_chatbot_models`.
2. Fill in `profile`. A new agent starts from its type's preset, so send only what differs: `businessName`, `goals`, `personality`, `formality`, `addressStyle`, `rules`, `handoffWhen`, and short `facts` (hours, address, delivery, ...). Longer material, such as a price list or FAQ, goes in the knowledge base (`create_knowledge_base`, `create_knowledge_item`).
3. Add `extraInstructions` only for what the profile can't say, in a few lines. No workflows.
4. List the requests the agent must handle (booking, order status, refunds, ...). For each, check `list_skills` with `source: template` and clone a template that fits (`clone_skill_template`), or write one with the `ecbot-skill-builder` skill. Attach each with `attach_skill`.
5. Turn on the tools the skills use with `enable_chatbot_tool`.
6. Create the agent with `status: inactive`, show the user what you set, and activate it only when they say so.

## Clean up an existing agent

1. Read it: `get_chatbot`, `list_chatbot_skills`, `list_chatbot_tools`.
2. Sort every sentence of `extraInstructions` into one of:
   - **Profile**: tone, address style or a rule the profile has an answer for. Set it in `profile`.
   - **Keep**: anything else that applies to every reply.
   - **Fact**: move to `profile.facts`, or the knowledge base when long.
   - **Workflow**: a sequence triggered by a kind of request. Group the sentences by request; each group becomes one Skill.
   - **Duplicate**: already covered by an attached skill or by `handoffKeywords`. Drop it.
3. Show the user the plan as a table (sentence, where it goes) and the new, short `extraInstructions`. Wait for their OK.
4. Create the skills with `ecbot-skill-builder` and attach them.
5. Only then `update_chatbot` with the shorter `extraInstructions` and the `profile` answers, so the agent never runs with a workflow missing.
6. Tell the user to try each request in the app's test chat.

## Example

Before, in `extraInstructions`:

> Be friendly and use "dạ". When a customer wants to book, ask the service, then the day and time, then their name and phone. We open 9:00 to 18:00. If they want to cancel within 24 hours, hand them to staff. Never promise a discount.

After:

- `profile`: `personality: ["warm"]`, `rules` adds `no_discount_promises`, `facts.opening_hours`: "9:00 to 18:00".
- `extraInstructions`: "Start replies with \"dạ\"."
- Skill "Book an appointment" and Skill "Cancel a booking", attached to the agent.
