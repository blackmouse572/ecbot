# Conversational Agent Builder

## Context

Creating an agent today means one long modal (`apps/app/src/routes/chatbot/components/chatbot-form/chatbot-form.tsx`, about 20 fields) with a blank "General knowledge" prompt editor. Non-technical owners do not know what to write, so agents come out weak or never get created. The chatbot `type` field is saved but never used in the prompt.

We prototyped three layouts on branch `prototype/agent-wizard-ui`. The owner picked **B, Conversation**: a builder that asks one thing at a time as chat messages, with the agent testable beside it. This plan turns that into production code, with these requirements from the owner:

1. The chat UI follows `packages/ui/src/components/common/ai/message.tsx` (`Message`, `MessageContent`, `Bubble`).
2. Questions use a Questionnaire with the same anatomy as shadcn's (https://ui.shadcn.com/docs/components/base/questionnaire). **We rebuild it ourselves** in `@repo/ui` on `@medusajs/ui` primitives, with no new dependency.
3. No "—" dash anywhere in copy or prompt templates.
4. Reuse common i18n terms (`actions.*`, `general.*`, `fields.*`).
5. Separate question groups with a divider (`Marker variant="separator"`).
6. All builder text is translated (vi and en), including tone examples.
7. Richer questions, shaped by the structured-prompt-writer framework, across **16 SMB types plus 5 personal-assistant types**. Each type gets its own recommended skills and tools.
8. Skills and tool setups are seeded and ready for every type, adapted from open-licensed sources instead of written from scratch.

Decisions already agreed:
- **Selections are saved as a profile.** The API builds the prompt from the profile and writes it into the existing `generalKnowledge` column, which `apps/ai` already reads. `apps/ai` does no building, and the existing invalidation (`ChatbotCacheService.invalidate`) refreshes it.
- **The free-text prompt editor goes away.** An optional "Extra instructions" field is appended at the end instead.
- **Prompt templates are in English.** The agent replies in the chosen primary language, and facts the user typed are kept as written.
- **A decision model turns a one-sentence description into suggested answers.** Amended 2026-09-24: it runs in `apps/ai` on OpenRouter through the existing LangChain structured-output pattern, with the model chosen by the `DECISION_MODEL` environment variable. The endpoint keeps TypeSafe System One's question/answer shape, so Jev can be plugged in later as another provider. apps/api forwards the call and caches suggestions in Redis.
- **The chatbot is created as an inactive draft after the Rules group**, so knowledge, tools and the test chat all work against a real chatbot ID.

## Architecture

```
packages/agent-blueprint (new, pure TS)   ← used by apps/api and apps/app
  business types, question groups, skill/tool recommendations,
  tool recipes, compilePrompt(profile, toolGuides) → markdown
packages/ui  common/questionnaire (new)   ← the question UI
apps/api     agent-builder module (new): Jev suggest + Redis cache
             chatbot: agentProfile jsonb, recompile on save
             chatbot_tool: usageGuide jsonb, recompile on change
             skill: more BUILTIN_SKILLS + seed
apps/app     routes/chatbot/chatbot-create → conversational builder
```

The question catalog and the compiler live in one shared package. That way the app can show "What your agent is told" and the API can produce the same text from the same code (AGENTS.md: shared code is extracted into a package).

## Phase 1: Builder, question catalog, prompt engine, Jev

### 1a. `packages/agent-blueprint` (new workspace package)
Set up like the other packages (`packages/auth` is the reference for package.json, tsconfig, exports).
- `business-types.ts`: 21 types, each with an id, i18n label key, icon name, `mode: "simple" | "detailed"`, and a `personal` flag.
  - SMB: restaurant, beauty_spa, clinic, fashion, cosmetics, ecommerce, real_estate, education, hotel, travel, fitness, automotive, insurance_finance, home_services, studio_events, health_foods.
  - Personal: scheduling, email_triage, tasks_reminders, research, personal_crm.
  - Detailed mode: clinic, real_estate, education, insurance_finance, hotel.
- `questions/`: the question groups, one per prompt section. Each question is `{ id, kind: "single" | "multi" | "text" | "scale", titleKey, descriptionKey?, choices?, required?, when?(profile) }`. Choices come in two layers: shared defaults, plus overrides per business type.

  | Group | Prompt section | Questions (highlights) |
  |---|---|---|
  | Start | none | describe in one sentence, or pick a template |
  | Identity | Requirements + Initialization | business type, business name, agent name, where customers message, main jobs (goals), greeting (suggested, editable) |
  | Essence | Essence | what makes you different (text), personality chips (warm, expert, playful, premium, energetic), formality scale |
  | Facts | Knowledge | questions per type, e.g. restaurant: hours, address, delivery, reservation policy; spa: services and prices, deposit; shop: shipping fee, returns, payment |
  | Process | Process | for each goal, what to collect (name, phone, address, time, party size…), and when to hand over to a person |
  | Rules | Rules | "never do" items (defaults depend on type), what to do when unsure |
  | Interaction | Interaction protocol | reply length, emoji, how to address customers (only when the language is vi), follow-up questions, after-hours behavior |
- `recommendations.ts`: for each type, the built-in skill slugs and toolkit recipe ids to suggest.
- `tool-recipes.ts`: for each Composio toolkit (GOOGLESHEETS, GOOGLECALENDAR, GMAIL, NOTION, AIRTABLE, HUBSPOT, CALENDLY, GOOGLEDRIVE, SLACK, TRELLO) plus the ECCHO `kiotviet` and a custom HTTP entry:
  - plain-language recipe questions ("What is in this sheet?", "When should the agent check it?", "What must it never read out?");
  - default `enabledActions`, using the action slugs from research (e.g. `GOOGLESHEETS_LOOKUP_SPREADSHEET_ROW`, `GOOGLECALENDAR_FIND_FREE_SLOTS`). Destructive actions are off by default.
- `compile-prompt.ts`: `compilePrompt(profile, toolGuides)` outputs structured markdown sections in this order: Requirements, Initialization, Essence, Knowledge (detailed mode only as a separate layered section), Process, Rules, Interaction protocol, Tools, Extra instructions. Written in English, with no "—", following the framework's principles (a specific opening, human warmth, every line purposeful). User text is inserted as given.
- `profile.ts`: the `AgentProfile` type plus a zod schema. The API uses the schema to validate.

### 1b. `@repo/ui` Questionnaire
`packages/ui/src/components/common/questionnaire/`, exported through `common/index.ts`.
- **Parts:** `Questionnaire`, `QuestionnaireItem`, `QuestionnaireTitle`, `QuestionnaireDescription`, `QuestionnaireChoices`, `QuestionnaireChoice`, `QuestionnaireInput`, `QuestionnaireError`, `QuestionnaireActions`, `QuestionnaireSkip`, `QuestionnaireNext`, `QuestionnaireProgress`.
- **Primitives:** fieldset and legend, with `@medusajs/ui` `RadioGroup.ChoiceBox` for single choice and a Checkbox card for multi choice.
- **Behavior:** keyboard shortcuts (numbers), conditional items (`disabled`), required validation.
- **Text:** no built-in strings. Labels come in through props, so the app translates them.

### 1c. API
- **Chatbot entity:**
  - Add `agentProfile?: AgentProfile` (jsonb) and `extraInstructions?: text`, with a MikroORM migration (`pnpm db:migrate:create`).
  - Add the new type values to `ENUM_CHATBOT_TYPE`. The column is varchar(100), so this needs no column change.
- **Create and update** (`chatbot.service.ts`, create/update DTOs, `CHATBOT_EDITABLE_FIELDS`):
  - When `agentProfile` is present: validate it with the blueprint zod schema, run `compilePrompt`, and write the result plus `extraInstructions` into `generalKnowledge`.
  - `create` must also call `chatbotCacheService.invalidate`, which it doesn't today.
- **New `agent-builder` module** (following `apps/api/docs` module structure):
  - Endpoint: `POST /:workspace/agent-builder/suggest { description }`.
  - It sends one TypeSafe request to `jev-latest` through the JS SDK `@typesafe-ai/sdk` (`new TypeSafeClient()`, `client.systemOne({...})`, answers read from `response.answers.<id>`). The request contains:
    - a Choice for business type;
    - a Choice for tone;
    - a Noul per goal;
    - a Noul per default rule;
    - a Choice between existing type-specific options for the Facts group.
  - It returns values with their confidence.
  - Cache: `CACHE_MANAGER` key `agent-builder:suggest:{sha256(description)}`, TTL 24h.
  - On any error it returns an empty suggestion, and the builder simply shows unselected choices.
  - Config: `TYPESAFE_API_KEY` in the api env and config module.
- **Client:** run `pnpm generate:client` for `@repo/client`.

### 1d. App builder (`apps/app/src/routes/chatbot/chatbot-create/`)
Follow `.github/instructions/app/*` and the eccho-frontend skill. Replace today's form route with a builder whose files are split by role:
- `agent-builder.tsx`: the layout (the conversation, plus a test panel that becomes a full-screen sheet on mobile).
- `components/builder-thread.tsx`: `MessageScroller` + `MessageScrollerViewport` + `MessageScrollerContent`.
  - **Assistant question:** a `Message from="assistant"` whose `MessageContent` holds the Questionnaire item.
  - **Answered question:** a `Message from="user"` whose `MessageContent render={<button/>}` shows a summary; clicking it re-opens the question for editing.
  - **Between groups:** `Marker variant="separator"` carrying the group name.
- `components/start-composer.tsx`: `PromptInput` for the one-sentence description, plus template buttons.
- `components/test-panel.tsx`: reuses `apps/app/src/components/ai-chat/ai-chat-card.tsx`, with a tab for "What your agent is told" rendered through `MessageResponse`.
- `hooks/use-agent-builder.ts`: holds the profile, current step and draft id. It saves with `useCreateChatbot` / update mutations (TanStack Query, per `data-fetching.instructions.md`).
  - The draft is created with `status: inactive` after the Rules group.
  - Each later answer triggers a debounced update.
- **Confidence badges:** 0.9 or higher means auto-filled; 0.5 to 0.9 means "please check"; below 0.5 leaves the choice empty.
- **i18n:** a new `agentBuilder.*` block in `en.json` and `vi.json`. Reuse `actions.*` (next, back, skip→add if missing, create, cancel) and `fields.*`. Tone examples are translated per locale. Follow `.claude/rules/i18n.md`.
- **Edit page** (`chatbot-form.tsx`):
  - Remove the General knowledge editor.
  - Add an "Extra instructions" field and an "Edit with builder" link.
  - For bots with no profile, prefill Extra instructions with the current `generalKnowledge`, so nothing is lost.

## Phase 2: Knowledge step
- **UI:** a new group after Rules. Upload files with `FileUpload`, paste a URL, or type an FAQ. Added items show as `AttachmentGroup` chips with their processing status.
- **Backend:** existing APIs only: knowledge-item create (FILE/URL/TEXT) plus `POST /:knowledgeItemId/link` on the draft chatbot. Reuse the hooks in `apps/app/src/hooks/api/knowledge-base`.

## Phase 3: Skills and tools
- **Skill seeds:** extend `apps/api/src/modules/skill/constants/builtin-skills.constant.ts`.
  - Adapt from `composio-community/support-skills` (MIT) and `anthropics/knowledge-work-plugins` (Apache 2.0). Keep an attribution header in each body and add `apps/api/src/modules/skill/constants/THIRD_PARTY_NOTICES.md`.
  - The set: faq-answering, product-recommendation, order-taking, order-status, appointment-booking, reservation, lead-qualification, escalation-to-human, follow-up, promotions-upsell, email-triage, task-reminders, research-summary. The existing refund-policy and complaint-handling stay.
  - Add `seed:skill` to the `migrate:seed` script in `apps/api/package.json`.
- **Attaching skills:** in `agent-builder.service`, `addRecommendedSkill(workspace, chatbotId, slug)` reuses the workspace's existing clone of that template if there is one, otherwise calls `SkillService.cloneFromTemplate`. It then calls `ChatbotSkillService.attach`.
- **Tools:**
  - Add `usageGuide?: Record<string,string>` (jsonb) to `ChatbotToolEntity`, with a migration.
  - The builder's Connect button uses the existing marketplace install flow (`POST /tool/marketplace/install` → OAuth redirect → `complete-install`), with a callback back to the builder.
  - Then `ChatbotToolService.enable` + `updateActions` (recipe defaults) + save `usageGuide`.
  - Any change to a chatbot's tools or guides re-runs `compilePrompt`, so the Tools section stays current and disappears when a tool is removed.
- **Jev action picking:** one Noul per discovered action ("is this action useful for these goals?") pre-selects actions beyond the recipe defaults.

## Phase 4: Behaviors and going live
- **Behaviors group:**
  - Plain-language toggles map to existing fields: `autoRead`, `typingIndicator`, `handoffKeywords` / `handoffMessage`.
  - The follow-up choice compiles into `followupRules`.
- **Go live group:**
  - Reuse `LinkedAccountsField` / `account-link-drawer` for channel linking.
  - "Go live" sets `status: active`. The group can be skipped.

## Critical files
- New: `packages/agent-blueprint/**`, `packages/ui/src/components/common/questionnaire/**`, `apps/api/src/modules/agent-builder/**`, builder files under `apps/app/src/routes/chatbot/chatbot-create/`
- Modified: `apps/api/src/modules/chatbot/{repository/entities/chatbot.entity.ts, enums/chatbot.enum.ts, services/chatbot.service.ts, dtos/request/*, constants/chatbot.update.constant.ts}`, `apps/api/src/modules/tool/repository/entities/chatbot-tool.entity.ts`, `apps/api/src/modules/skill/constants/builtin-skills.constant.ts`, `apps/api/package.json`, `apps/app/src/routes/chatbot/components/chatbot-form/chatbot-form.tsx`, `apps/app/src/i18n/translations/{en,vi}.json`, `packages/ui/src/components/common/index.ts`
- Reused as is: `ai/message.tsx`, `ai/marker.tsx`, `ai/message-scroller.tsx`, `ai/prompt-input.tsx`, `ai/attachment.tsx`, `file-upload`, `components/ai-chat/ai-chat-card.tsx`, `SkillService.cloneFromTemplate`, `ChatbotSkillService.attach`, `ChatbotToolService`, the marketplace install flow, `ChatbotCacheService.invalidate`

## Work setup
Implement on a new branch from `main` (not the prototype branch). The prototype stays on `prototype/agent-wizard-ui` as the reference. Its `vite.config.ts` `allowedHosts` change is not carried over.

## Verification (TDD, red then green)
- **`packages/agent-blueprint` (vitest):**
  - `compilePrompt` snapshot for each of the 21 types;
  - no "—" in any template or in the `agentBuilder` translations;
  - every `titleKey` exists in both `en.json` and `vi.json`;
  - every recommended skill slug exists in `BUILTIN_SKILLS`, and every recipe's default action is in its toolkit list;
  - the zod schema rejects bad profiles.
- **`@repo/ui` Questionnaire:** single, multi, text, conditional, required and keyboard behavior.
- **API unit tests:**
  - create/update with `agentProfile` writes the compiled `generalKnowledge` and invalidates the cache;
  - a legacy bot with no profile is untouched;
  - suggest: a cache hit makes no TypeSafe call, and a TypeSafe failure returns an empty suggestion;
  - the recommended-skill clone is reused;
  - a tool guide change recompiles the prompt.
- **App tests:** extend the pattern in `chatbot-form.test.tsx` to cover the builder flow (describe → suggestions → edit an answer → draft created → test panel visible).
- **End to end:** `pnpm turbo run dev --filter='!edge'`. Then:
  1. Build a spa agent from one sentence at desktop and 375px widths.
  2. Check the `chatbots.general_knowledge` row contains the structured sections.
  3. Ask the preview chat a price question and a booking question.
  4. Switch the UI to vi and en and confirm there are no untranslated strings and no "—".
- **Lint and types:** `pnpm lint` and type checks.
