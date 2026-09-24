# Agent Builder, Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long "create chatbot" form with a conversational builder. It asks structured questions (with answers pre-filled by Jev from one sentence) and turns the answers into a well-structured prompt that the API stores in `generalKnowledge`.

**Architecture:**
- **Shared package.** A new pure TypeScript package, `@repo/agent-blueprint`, holds the business types, question catalog, profile schema, Jev question builder and prompt compiler. Both `apps/api` (built CommonJS `dist`) and `apps/app` (TS source through Vite) use it.
- **API.** The API stores the answers as `chatbots.agent_profile`, compiles them into `generalKnowledge` on every save, and serves `POST /:workspace/agent-builder/suggest`. That endpoint calls TypeSafe's HTTP API, and results are cached in Redis.
- **App.** The app renders the builder as a chat using the `@repo/ui` Message and Marker components and a new `@repo/ui` Questionnaire.

**Tech Stack:** TypeScript, zod 4.2.0, NestJS 11 + MikroORM (Postgres jsonb) + `@nestjs/cache-manager` (Redis), React 19 + TanStack Query v5 + i18next + `@medusajs/ui`, vitest (packages, app), jest + @swc/jest (api), TypeSafe System One HTTP API (`jev-latest`).

**Spec:** `docs/superpowers/specs/2026-09-24-agent-builder-design.md`. This plan covers **Phase 1** of the spec. Phases 2 (knowledge), 3 (skills, tools, tool recipes and recommendations) and 4 (behaviors, channels) get their own plans after Phase 1 ships.

**Deviations from the spec (on purpose):**
1. `recommendations.ts` and `tool-recipes.ts` move to the Phase 3 plan, because nothing consumes them in Phase 1. `compilePrompt` already accepts tool guides, so Phase 3 only adds data.
2. Jev is called through its documented HTTP endpoint (`POST https://api.typesafe.ai/v1/systemone`) instead of the `@typesafe-ai/sdk` package. `apps/api` compiles to CommonJS, and plain `fetch` avoids any ESM interop risk and adds no dependency.

## Global Constraints

- **No em dash.** Never use "—" in any UI string, translation, prompt template or test fixture that users or the model read.
- **Translations.** All builder UI text lives in `apps/app/src/i18n/translations/en.json` and `vi.json`, and new keys must exist in both. Reuse `actions.*` (next, back, edit, cancel, create) instead of new keys. Add `actions.skip` once, because it doesn't exist yet.
- **Prompt language.** Prompt templates are English only. User-typed text is inserted exactly as typed.
- **Business type IDs are the chatbot type enum values.** Reuse the existing ones: restaurant, beauty, healthcare, fashion, ecommerce, real_estate, education, travel, fitness, automotive, finance. Add new ones: cosmetics, hotel, home_services, studio_events, health_foods, personal_scheduling, personal_email, personal_tasks, personal_research, personal_crm. Legacy values spa, entertainment and other stay valid but aren't offered.
- **Detailed prompt mode** is used for healthcare, real_estate, education, finance and hotel. Every other type uses simple mode.
- **Confidence thresholds:** 0.9 or higher means auto-filled; 0.5 to 0.9 means "please check"; below 0.5 means don't apply.
- **Jev config:** model `jev-latest`, and the API key only ever lives server-side in `TYPESAFE_API_KEY`.
- **Suggestion cache:** key `agent-builder:suggest:v1:{sha256(description)}`, TTL 86,400,000 ms (24 h).
- **Draft timing:** the chatbot is created with `status: inactive` once every question in the identity, essence, facts, process and rules groups is answered or skipped. "Finish" activates it.
- **Existing bots:** a chatbot with no `agentProfile` keeps its current `generalKnowledge` unless the user saves new Extra instructions.
- **Tests first.** Write each failing test before the implementation (AGENTS.md).

## Review Focus

1. **Legacy chatbot edited after deploy** (no `agentProfile`, long `generalKnowledge`). Its prompt must not be wiped or replaced by an empty compiled prompt. Pinned in Task 7.
2. **TypeSafe down, slow, key missing, or returns malformed JSON.** The builder must still work, with empty suggestions and no error toast that blocks progress. Pinned in Tasks 8 and 11.
3. **User changes business type after answering several questions.** Goals, rules and facts must switch to the new type's presets, with no leftover facts from the old type in the compiled prompt. Pinned in Task 2 (`applyPreset`), Task 10 (reducer resets answers) and Task 3 (`compilePrompt` ignores fact ids not in the current type).
4. **User text containing prompt-looking markup** (e.g. `## Rules`, `<system>`, very long text). It must be inserted as plain text, and length must be capped by schema so it can't blow up the prompt. Pinned in Task 2 (schema max lengths) and Task 3 (headings in user text are escaped to plain text).
5. **Vietnamese-only question shown for an English agent** (address style). It must be hidden when `primaryLanguage !== "vi"`, and the compiled prompt must not include it. Pinned in Tasks 3 and 4.

---

## File Structure

```
packages/agent-blueprint/                  NEW workspace package
  package.json, tsconfig.json, tsconfig.build.json, vitest.config.ts
  src/index.ts                             public exports
  src/business-types.ts                    21 types: id, promptLabel, mode, personal, i18n key
  src/libraries.ts                         goals, rules, unsure, handoff, collect, personality,
                                           formality, replyLength, addressStyle, afterHours,
                                           channels, facts (id + English prompt text)
  src/presets.ts                           per-type defaults (goals, rules, facts, collect)
  src/profile.ts                           AgentProfile zod schema + createProfile/applyPreset
  src/questions.ts                         buildQuestionGroups(profile) + allTranslationKeys()
  src/compile-prompt.ts                    compilePrompt(profile, options) → markdown
  src/suggest.ts                           buildSuggestQuestions() + readSuggestAnswers() + applySuggestion()
  src/*.test.ts                            vitest

packages/ui/src/components/common/questionnaire/   NEW
  questionnaire.tsx, questionnaire.test.tsx, index.ts

apps/api/
  src/configs/agent-builder.config.ts      NEW
  src/modules/agent-builder/               NEW module
    agent-builder.module.ts
    controllers/agent-builder.workspace.controller.ts
    docs/agent-builder.workspace.doc.ts
    dtos/request/agent-builder.suggest.request.dto.ts
    dtos/response/agent-builder.suggest.response.dto.ts
    services/typesafe-api.service.ts
    services/agent-builder.service.ts
  src/languages/{en,vi}/agentBuilder.json  NEW
  src/modules/chatbot/…                    MODIFY entity, enum, DTOs, service, editable fields
  migrations/<timestamp>_chatbot_agent_profile.ts   GENERATED
  test/modules/agent-builder/services/*.spec.ts     NEW
  test/modules/chatbot/services/chatbot.service.profile.spec.ts NEW

apps/app/src/
  hooks/api/agent-builder.ts               NEW suggest mutation
  routes/chatbot/chatbot-create/
    chatbot-create.tsx                     MODIFY → renders AgentBuilder
    agent-builder/
      agent-builder.tsx                    layout (thread + test panel / mobile sheet)
      builder-state.ts (+ .test.ts)        pure reducer
      use-agent-builder.ts                 effects: suggest, create draft, update, finish
      i18n-keys.test.ts                    every catalog key exists in en/vi, no "—"
      components/start-composer.tsx
      components/question-message.tsx
      components/answer-message.tsx
      components/builder-thread.tsx
      components/test-panel.tsx
      agent-builder.test.tsx
  routes/chatbot/components/chatbot-form/chatbot-form.tsx   MODIFY (Extra instructions)
  i18n/translations/{en,vi}.json           MODIFY
turbo.json                                 MODIFY (api#dev depends on blueprint build)
```

---

### Task 1: `@repo/agent-blueprint` package, business types and libraries

**Files:**
- Create: `packages/agent-blueprint/package.json`
- Create: `packages/agent-blueprint/tsconfig.json`
- Create: `packages/agent-blueprint/tsconfig.build.json`
- Create: `packages/agent-blueprint/vitest.config.ts`
- Create: `packages/agent-blueprint/src/business-types.ts`
- Create: `packages/agent-blueprint/src/libraries.ts`
- Create: `packages/agent-blueprint/src/presets.ts`
- Create: `packages/agent-blueprint/src/index.ts`
- Test: `packages/agent-blueprint/src/catalog.test.ts`
- Modify: `turbo.json`

**Interfaces:**
- Produces:
  - `BUSINESS_TYPES: readonly BusinessType[]` and `BusinessTypeId` (union of the 21 ids).
  - `getBusinessType(id: BusinessTypeId): BusinessType`
  - `BusinessType = { id; promptLabel: string; mode: "simple" | "detailed"; personal: boolean }`
  - The libraries `GOALS`, `RULES`, `UNSURE`, `HANDOFF_WHEN`, `COLLECT`, `PERSONALITY`, `FORMALITY`, `REPLY_LENGTH`, `ADDRESS_STYLE`, `AFTER_HOURS`, `CHANNELS`, `FACTS`. Each is a `readonly { id: string; prompt: string }[]` declared `as const`, and each id union is exported (`GoalId`, `RuleId`, `UnsureId`, `HandoffWhenId`, `CollectId`, `PersonalityId`, `FormalityId`, `ReplyLengthId`, `AddressStyleId`, `AfterHoursId`, `ChannelId`, `FactId`).
  - `PRESETS: Record<BusinessTypeId, Preset>` where `Preset = { goals: GoalId[]; rules: RuleId[]; facts: FactId[]; collect: CollectId[] }`.
  - `promptOf(list, id): string`

- [ ] **Step 1: Create the package scaffold**

`packages/agent-blueprint/package.json`:
```json
{
  "name": "@repo/agent-blueprint",
  "private": true,
  "version": "0.0.0",
  "main": "./dist/index.js",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.build.json --watch --preserveWatchOutput",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "git clean -xdf .turbo dist node_modules"
  },
  "dependencies": {
    "zod": "4.2.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.9.3",
    "vitest": "^4.1.11"
  }
}
```

`packages/agent-blueprint/tsconfig.json`:
```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": { "rootDir": "src", "noEmit": true, "resolveJsonModule": true },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

`packages/agent-blueprint/tsconfig.build.json` (CommonJS output for apps/api):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "module": "CommonJS",
    "moduleResolution": "node",
    "declaration": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

`packages/agent-blueprint/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

Run: `ls packages/typescript-config` and confirm `base.json` exists. If it doesn't, extend the file `packages/auth/tsconfig.json` extends (`@repo/typescript-config/nextjs.json`) instead.

Then: `pnpm install` (from the repo root)
Expected: the lockfile updates and no errors.

- [ ] **Step 2: Write the failing catalog test**

`packages/agent-blueprint/src/catalog.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES, getBusinessType } from "./business-types";
import {
  COLLECT, FACTS, GOALS, RULES,
} from "./libraries";
import { PRESETS } from "./presets";

const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);

describe("catalog", () => {
  it("has 16 SMB and 5 personal types", () => {
    expect(BUSINESS_TYPES.filter((t) => !t.personal)).toHaveLength(16);
    expect(BUSINESS_TYPES.filter((t) => t.personal)).toHaveLength(5);
  });

  it("uses detailed mode for exactly the five high-stakes types", () => {
    const detailed = BUSINESS_TYPES.filter((t) => t.mode === "detailed").map((t) => t.id).sort();
    expect(detailed).toEqual(["education", "finance", "healthcare", "hotel", "real_estate"]);
  });

  it("gives every type a preset whose ids all exist in the libraries", () => {
    for (const type of BUSINESS_TYPES) {
      const preset = PRESETS[type.id];
      expect(preset, type.id).toBeDefined();
      preset.goals.forEach((g) => expect(ids(GOALS)).toContain(g));
      preset.rules.forEach((r) => expect(ids(RULES)).toContain(r));
      preset.facts.forEach((f) => expect(ids(FACTS)).toContain(f));
      preset.collect.forEach((c) => expect(ids(COLLECT)).toContain(c));
      expect(preset.goals.length, type.id).toBeGreaterThan(0);
    }
  });

  it("never uses an em dash in prompt text", () => {
    const all = [...BUSINESS_TYPES.map((t) => t.promptLabel), ...[GOALS, RULES, FACTS, COLLECT].flat().map((x) => x.prompt)];
    all.forEach((text) => expect(text).not.toContain("—"));
  });

  it("looks up a type by id", () => {
    expect(getBusinessType("healthcare").mode).toBe("detailed");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @repo/agent-blueprint test`
Expected: FAIL with "Failed to resolve import "./business-types"".

- [ ] **Step 4: Implement the catalog**

`packages/agent-blueprint/src/business-types.ts`:
```ts
export const BUSINESS_TYPES = [
  { id: "restaurant", promptLabel: "restaurant or café", mode: "simple", personal: false },
  { id: "beauty", promptLabel: "beauty salon or spa", mode: "simple", personal: false },
  { id: "healthcare", promptLabel: "clinic or dental practice", mode: "detailed", personal: false },
  { id: "fashion", promptLabel: "fashion and accessories shop", mode: "simple", personal: false },
  { id: "cosmetics", promptLabel: "cosmetics and skincare shop", mode: "simple", personal: false },
  { id: "ecommerce", promptLabel: "online shop", mode: "simple", personal: false },
  { id: "real_estate", promptLabel: "real estate agency", mode: "detailed", personal: false },
  { id: "education", promptLabel: "education centre or online course provider", mode: "detailed", personal: false },
  { id: "hotel", promptLabel: "hotel or homestay", mode: "detailed", personal: false },
  { id: "travel", promptLabel: "travel agency", mode: "simple", personal: false },
  { id: "fitness", promptLabel: "gym or fitness studio", mode: "simple", personal: false },
  { id: "automotive", promptLabel: "car or motorbike showroom and garage", mode: "simple", personal: false },
  { id: "finance", promptLabel: "insurance and finance advisory", mode: "detailed", personal: false },
  { id: "home_services", promptLabel: "home services and interior business", mode: "simple", personal: false },
  { id: "studio_events", promptLabel: "photo studio and events business", mode: "simple", personal: false },
  { id: "health_foods", promptLabel: "health foods and supplements shop", mode: "simple", personal: false },
  { id: "personal_scheduling", promptLabel: "scheduling assistant", mode: "simple", personal: true },
  { id: "personal_email", promptLabel: "email assistant", mode: "simple", personal: true },
  { id: "personal_tasks", promptLabel: "tasks and reminders assistant", mode: "simple", personal: true },
  { id: "personal_research", promptLabel: "research assistant", mode: "simple", personal: true },
  { id: "personal_crm", promptLabel: "personal CRM assistant", mode: "simple", personal: true },
] as const satisfies readonly {
  id: string;
  promptLabel: string;
  mode: "simple" | "detailed";
  personal: boolean;
}[];

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type BusinessTypeId = BusinessType["id"];

export const BUSINESS_TYPE_IDS = BUSINESS_TYPES.map((t) => t.id) as [BusinessTypeId, ...BusinessTypeId[]];

export function getBusinessType(id: BusinessTypeId): BusinessType {
  const type = BUSINESS_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`Unknown business type: ${id}`);
  return type;
}
```

`packages/agent-blueprint/src/libraries.ts`:
```ts
type Entry = { readonly id: string; readonly prompt: string };

export const GOALS = [
  { id: "answer_questions", prompt: "Answer questions about products, services, prices and policies using only the business facts and knowledge you were given." },
  { id: "recommend", prompt: "Recommend the most suitable product or service after asking one or two short questions about what the customer needs." },
  { id: "take_orders", prompt: "Take orders: confirm items, quantity, price, delivery address and phone number, then read the full order back before closing." },
  { id: "book_appointments", prompt: "Book appointments: offer available times, confirm the service, date, time and contact details, then read the booking back." },
  { id: "reservations", prompt: "Take reservations: confirm the date, time, number of guests or rooms, and contact details." },
  { id: "capture_leads", prompt: "Collect contact details from interested customers so the team can follow up." },
  { id: "qualify_leads", prompt: "Qualify leads by asking about budget, timeline and needs before handing over to the team." },
  { id: "order_status", prompt: "Help customers check the status of an existing order." },
  { id: "after_sales", prompt: "Handle returns, exchanges, warranty questions and complaints with patience." },
  { id: "promotions", prompt: "Mention current promotions when they are relevant, without pressure." },
  { id: "manage_schedule", prompt: "Manage the owner's calendar: find free time, schedule, reschedule and cancel meetings." },
  { id: "triage_email", prompt: "Sort incoming email by priority, summarise it, and draft replies for the owner to approve." },
  { id: "track_tasks", prompt: "Keep track of tasks and reminders and give the owner a short daily summary." },
  { id: "research", prompt: "Research topics on request and return short summaries that name their sources." },
  { id: "log_contacts", prompt: "Log contacts and conversations, and remind the owner when a follow-up is due." },
] as const satisfies readonly Entry[];

export const RULES = [
  { id: "no_invented_prices", prompt: "Never invent prices, stock levels or policies. If they are not in the facts or knowledge you were given, say you will check." },
  { id: "no_discount_promises", prompt: "Never promise discounts, gifts or free shipping that are not listed in the facts." },
  { id: "no_medical_advice", prompt: "Do not diagnose or give medical advice. Suggest seeing a qualified professional." },
  { id: "no_financial_advice", prompt: "Do not give personal financial or legal advice. Share general information only." },
  { id: "no_competitors", prompt: "Do not discuss or compare competitors." },
  { id: "no_personal_data_requests", prompt: "Only ask for personal details that the current task needs." },
  { id: "no_guarantees", prompt: "Do not guarantee results or outcomes." },
  { id: "no_health_claims", prompt: "Do not claim that a product cures or treats any illness." },
  { id: "confirm_before_acting", prompt: "Ask the owner to confirm before sending, booking or deleting anything on their behalf." },
] as const satisfies readonly Entry[];

export const UNSURE = [
  { id: "handoff", prompt: "Tell the customer you will check with the team, then hand the conversation to a person." },
  { id: "collect_contact", prompt: "Ask for a phone number or email so the team can get back to them." },
  { id: "say_unknown", prompt: "Say honestly that you do not know and suggest a sensible next step." },
] as const satisfies readonly Entry[];

export const HANDOFF_WHEN = [
  { id: "asks_for_human", prompt: "the customer asks for a person" },
  { id: "upset", prompt: "the customer is upset" },
  { id: "unsure", prompt: "you are not sure of the answer" },
  { id: "large_order", prompt: "the order or deal is large or unusual" },
  { id: "complaint", prompt: "the customer makes a complaint" },
] as const satisfies readonly Entry[];

export const COLLECT = [
  { id: "name", prompt: "full name" },
  { id: "phone", prompt: "phone number" },
  { id: "email", prompt: "email" },
  { id: "address", prompt: "delivery address" },
  { id: "date_time", prompt: "preferred date and time" },
  { id: "party_size", prompt: "number of people" },
  { id: "budget", prompt: "budget" },
  { id: "product_interest", prompt: "product or service of interest" },
  { id: "notes", prompt: "special requests" },
] as const satisfies readonly Entry[];

export const PERSONALITY = [
  { id: "warm", prompt: "warm and caring" },
  { id: "expert", prompt: "knowledgeable and precise" },
  { id: "playful", prompt: "light and playful" },
  { id: "premium", prompt: "refined and premium" },
  { id: "energetic", prompt: "upbeat and energetic" },
  { id: "calm", prompt: "calm and reassuring" },
] as const satisfies readonly Entry[];

export const FORMALITY = [
  { id: "casual", prompt: "Casual and friendly, like chatting with a regular customer." },
  { id: "balanced", prompt: "Friendly but polite." },
  { id: "formal", prompt: "Formal and respectful at all times." },
] as const satisfies readonly Entry[];

export const REPLY_LENGTH = [
  { id: "short", prompt: "Keep replies to one or two sentences." },
  { id: "medium", prompt: "Keep replies to a short paragraph." },
  { id: "detailed", prompt: "Give detailed replies when the question needs it, otherwise stay brief." },
] as const satisfies readonly Entry[];

export const ADDRESS_STYLE = [
  { id: "em_anhchi", prompt: "Refer to yourself as \"em\" and address the customer as \"anh\" or \"chị\"." },
  { id: "minh_ban", prompt: "Refer to yourself as \"mình\" and address the customer as \"bạn\"." },
  { id: "shop_ban", prompt: "Refer to yourself as \"shop\" and address the customer as \"bạn\"." },
  { id: "toi_quykhach", prompt: "Refer to yourself as \"tôi\" and address the customer as \"quý khách\"." },
] as const satisfies readonly Entry[];

export const AFTER_HOURS = [
  { id: "reply_normally", prompt: "Reply as usual." },
  { id: "share_hours", prompt: "Reply as usual and mention the opening hours." },
  { id: "promise_callback", prompt: "Take the request and promise that the team will get back during opening hours." },
] as const satisfies readonly Entry[];

export const CHANNELS = [
  { id: "messenger", prompt: "Facebook Messenger" },
  { id: "instagram", prompt: "Instagram" },
  { id: "zalo", prompt: "Zalo" },
  { id: "tiktok", prompt: "TikTok Shop" },
  { id: "shopee", prompt: "Shopee" },
  { id: "website", prompt: "the website chat" },
] as const satisfies readonly Entry[];

export const FACTS = [
  { id: "opening_hours", prompt: "Opening hours" },
  { id: "address", prompt: "Address and branches" },
  { id: "service_area", prompt: "Service area" },
  { id: "delivery", prompt: "Delivery" },
  { id: "shipping_fee", prompt: "Shipping fees and times" },
  { id: "payment_methods", prompt: "Payment methods" },
  { id: "return_policy", prompt: "Return and exchange policy" },
  { id: "warranty", prompt: "Warranty" },
  { id: "menu_highlights", prompt: "Menu highlights and prices" },
  { id: "reservation_policy", prompt: "Reservation policy" },
  { id: "services_prices", prompt: "Services and prices" },
  { id: "deposit_policy", prompt: "Deposit and cancellation policy" },
  { id: "doctors_specialties", prompt: "Doctors and specialties" },
  { id: "insurance_accepted", prompt: "Insurance accepted" },
  { id: "size_guide", prompt: "Size guide" },
  { id: "stock_updates", prompt: "How stock is checked" },
  { id: "skin_types", prompt: "Products by skin type" },
  { id: "authenticity", prompt: "Authenticity and origin" },
  { id: "projects", prompt: "Projects and listings" },
  { id: "price_range", prompt: "Price range" },
  { id: "courses", prompt: "Courses and fees" },
  { id: "schedule", prompt: "Class schedule" },
  { id: "level_test", prompt: "Placement or level test" },
  { id: "room_types", prompt: "Room types and prices" },
  { id: "checkin_policy", prompt: "Check-in and check-out policy" },
  { id: "tour_packages", prompt: "Tour packages and prices" },
  { id: "visa_support", prompt: "Visa and document support" },
  { id: "membership_plans", prompt: "Membership plans and prices" },
  { id: "trial_class", prompt: "Trial class" },
  { id: "car_models", prompt: "Models and prices" },
  { id: "test_drive", prompt: "Test drives" },
  { id: "service_booking", prompt: "Maintenance and service booking" },
  { id: "products_plans", prompt: "Products and plans" },
  { id: "eligibility", prompt: "Who is eligible" },
  { id: "services_offered", prompt: "Services offered" },
  { id: "quote_process", prompt: "How quotes work" },
  { id: "packages", prompt: "Packages and prices" },
  { id: "booking_lead_time", prompt: "How far ahead to book" },
  { id: "key_ingredients", prompt: "Key ingredients" },
  { id: "certifications", prompt: "Certifications" },
  { id: "working_hours", prompt: "Owner's working hours" },
  { id: "priorities", prompt: "What matters most to the owner" },
  { id: "email_rules", prompt: "How to handle email" },
  { id: "reminder_style", prompt: "How and when to remind" },
  { id: "sources", prompt: "Preferred sources" },
  { id: "followup_cadence", prompt: "How often to follow up" },
] as const satisfies readonly Entry[];

type IdOf<T extends readonly Entry[]> = T[number]["id"];
export type GoalId = IdOf<typeof GOALS>;
export type RuleId = IdOf<typeof RULES>;
export type UnsureId = IdOf<typeof UNSURE>;
export type HandoffWhenId = IdOf<typeof HANDOFF_WHEN>;
export type CollectId = IdOf<typeof COLLECT>;
export type PersonalityId = IdOf<typeof PERSONALITY>;
export type FormalityId = IdOf<typeof FORMALITY>;
export type ReplyLengthId = IdOf<typeof REPLY_LENGTH>;
export type AddressStyleId = IdOf<typeof ADDRESS_STYLE>;
export type AfterHoursId = IdOf<typeof AFTER_HOURS>;
export type ChannelId = IdOf<typeof CHANNELS>;
export type FactId = IdOf<typeof FACTS>;

export const idsOf = <T extends readonly Entry[]>(list: T) =>
  list.map((x) => x.id) as [IdOf<T>, ...IdOf<T>[]];

export function promptOf(list: readonly Entry[], id: string): string {
  return list.find((x) => x.id === id)?.prompt ?? id;
}

export const PERSONAL_GOALS: GoalId[] = ["manage_schedule", "triage_email", "track_tasks", "research", "log_contacts", "capture_leads"];
```

`packages/agent-blueprint/src/presets.ts`:
```ts
import type { BusinessTypeId } from "./business-types";
import type { CollectId, FactId, GoalId, RuleId } from "./libraries";

export type Preset = { goals: GoalId[]; rules: RuleId[]; facts: FactId[]; collect: CollectId[] };

export const PRESETS: Record<BusinessTypeId, Preset> = {
  restaurant: { goals: ["answer_questions", "reservations", "take_orders", "promotions"], rules: ["no_invented_prices", "no_discount_promises"], facts: ["opening_hours", "address", "menu_highlights", "reservation_policy", "delivery", "payment_methods"], collect: ["name", "phone", "date_time", "party_size"] },
  beauty: { goals: ["answer_questions", "recommend", "book_appointments", "promotions"], rules: ["no_invented_prices", "no_medical_advice", "no_guarantees"], facts: ["services_prices", "opening_hours", "address", "deposit_policy", "payment_methods"], collect: ["name", "phone", "date_time", "product_interest"] },
  healthcare: { goals: ["answer_questions", "book_appointments", "capture_leads"], rules: ["no_medical_advice", "no_invented_prices", "no_guarantees", "no_personal_data_requests"], facts: ["services_prices", "doctors_specialties", "opening_hours", "address", "insurance_accepted", "deposit_policy"], collect: ["name", "phone", "date_time", "notes"] },
  fashion: { goals: ["answer_questions", "recommend", "take_orders", "order_status", "after_sales"], rules: ["no_invented_prices", "no_discount_promises"], facts: ["size_guide", "shipping_fee", "return_policy", "payment_methods", "stock_updates"], collect: ["name", "phone", "address", "product_interest"] },
  cosmetics: { goals: ["answer_questions", "recommend", "take_orders", "after_sales"], rules: ["no_invented_prices", "no_health_claims", "no_medical_advice"], facts: ["skin_types", "authenticity", "shipping_fee", "return_policy", "payment_methods"], collect: ["name", "phone", "address", "product_interest"] },
  ecommerce: { goals: ["answer_questions", "recommend", "take_orders", "order_status", "after_sales", "promotions"], rules: ["no_invented_prices", "no_discount_promises"], facts: ["shipping_fee", "delivery", "payment_methods", "return_policy", "warranty"], collect: ["name", "phone", "address", "product_interest"] },
  real_estate: { goals: ["answer_questions", "qualify_leads", "book_appointments", "capture_leads"], rules: ["no_invented_prices", "no_financial_advice", "no_guarantees"], facts: ["projects", "price_range", "address", "payment_methods"], collect: ["name", "phone", "budget", "date_time"] },
  education: { goals: ["answer_questions", "recommend", "capture_leads", "book_appointments"], rules: ["no_invented_prices", "no_guarantees"], facts: ["courses", "schedule", "level_test", "services_prices", "address"], collect: ["name", "phone", "email", "product_interest"] },
  hotel: { goals: ["answer_questions", "reservations", "promotions"], rules: ["no_invented_prices", "no_discount_promises"], facts: ["room_types", "checkin_policy", "deposit_policy", "address", "payment_methods"], collect: ["name", "phone", "date_time", "party_size"] },
  travel: { goals: ["answer_questions", "recommend", "qualify_leads", "capture_leads"], rules: ["no_invented_prices", "no_guarantees"], facts: ["tour_packages", "visa_support", "deposit_policy", "payment_methods"], collect: ["name", "phone", "date_time", "party_size", "budget"] },
  fitness: { goals: ["answer_questions", "book_appointments", "capture_leads", "promotions"], rules: ["no_invented_prices", "no_medical_advice", "no_guarantees"], facts: ["membership_plans", "trial_class", "schedule", "opening_hours", "address"], collect: ["name", "phone", "date_time"] },
  automotive: { goals: ["answer_questions", "book_appointments", "qualify_leads", "capture_leads"], rules: ["no_invented_prices", "no_discount_promises", "no_financial_advice"], facts: ["car_models", "test_drive", "service_booking", "address", "opening_hours"], collect: ["name", "phone", "date_time", "product_interest"] },
  finance: { goals: ["answer_questions", "qualify_leads", "capture_leads"], rules: ["no_financial_advice", "no_guarantees", "no_personal_data_requests"], facts: ["products_plans", "eligibility", "opening_hours"], collect: ["name", "phone", "product_interest"] },
  home_services: { goals: ["answer_questions", "book_appointments", "capture_leads"], rules: ["no_invented_prices", "no_guarantees"], facts: ["services_offered", "service_area", "quote_process", "warranty"], collect: ["name", "phone", "address", "date_time"] },
  studio_events: { goals: ["answer_questions", "recommend", "book_appointments", "capture_leads"], rules: ["no_invented_prices", "no_discount_promises"], facts: ["packages", "booking_lead_time", "deposit_policy", "address"], collect: ["name", "phone", "date_time", "budget"] },
  health_foods: { goals: ["answer_questions", "recommend", "take_orders"], rules: ["no_health_claims", "no_medical_advice", "no_invented_prices"], facts: ["key_ingredients", "certifications", "shipping_fee", "payment_methods"], collect: ["name", "phone", "address", "product_interest"] },
  personal_scheduling: { goals: ["manage_schedule"], rules: ["confirm_before_acting", "no_personal_data_requests"], facts: ["working_hours", "priorities"], collect: [] },
  personal_email: { goals: ["triage_email"], rules: ["confirm_before_acting"], facts: ["email_rules", "priorities"], collect: [] },
  personal_tasks: { goals: ["track_tasks"], rules: ["confirm_before_acting"], facts: ["reminder_style", "priorities", "working_hours"], collect: [] },
  personal_research: { goals: ["research"], rules: ["no_guarantees"], facts: ["sources", "priorities"], collect: [] },
  personal_crm: { goals: ["log_contacts", "capture_leads"], rules: ["confirm_before_acting", "no_personal_data_requests"], facts: ["followup_cadence", "priorities"], collect: [] },
};
```

`packages/agent-blueprint/src/index.ts`:
```ts
export * from "./business-types";
export * from "./libraries";
export * from "./presets";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @repo/agent-blueprint test`
Expected: PASS (5 tests).

- [ ] **Step 6: Make `api#dev` wait for the blueprint build**

In `turbo.json`, add this under `"tasks"`, next to `"dev"`:
```json
    "api#dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["@repo/agent-blueprint#build"]
    },
```
Run: `pnpm --filter @repo/agent-blueprint build && ls packages/agent-blueprint/dist/index.js`
Expected: the file exists.

Add `dist` to the package ignore list: create `packages/agent-blueprint/.gitignore` with the single line `dist`.

- [ ] **Step 7: Commit**

```bash
git add packages/agent-blueprint turbo.json pnpm-lock.yaml
git commit -m "feat(agent-blueprint): business types, libraries and presets"
```

---

### Task 2: `AgentProfile` schema, `createProfile`, `applyPreset`

**Files:**
- Create: `packages/agent-blueprint/src/profile.ts`
- Test: `packages/agent-blueprint/src/profile.test.ts`
- Modify: `packages/agent-blueprint/src/index.ts`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces:
  - `agentProfileSchema` (zod) and `AgentProfile = z.infer<typeof agentProfileSchema>`
  - `createProfile(type: BusinessTypeId, primaryLanguage: string): AgentProfile`
  - `applyPreset(profile: AgentProfile, type: BusinessTypeId): AgentProfile`
  - `PROFILE_LIMITS = { shortText: 120, longText: 1000 }`

`AgentProfile` fields (every later task uses these exact names): `version: 1`, `businessType`, `businessName`, `agentName`, `channels: ChannelId[]`, `goals: GoalId[]`, `greeting: string`, `difference: string`, `personality: PersonalityId[]` (max 2), `formality: FormalityId`, `facts: Partial<Record<FactId, string>>`, `collect: CollectId[]`, `handoffWhen: HandoffWhenId[]`, `rules: RuleId[]`, `unsure: UnsureId`, `replyLength: ReplyLengthId`, `emoji: boolean`, `addressStyle: AddressStyleId | null`, `followUpQuestions: boolean`, `afterHours: AfterHoursId`, `primaryLanguage: string`.

- [ ] **Step 1: Write the failing test**

`packages/agent-blueprint/src/profile.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { agentProfileSchema, applyPreset, createProfile } from "./profile";

describe("createProfile", () => {
  it("fills presets and sane defaults for an SMB type", () => {
    const p = createProfile("beauty", "vi");
    expect(p.goals).toEqual(["answer_questions", "recommend", "book_appointments", "promotions"]);
    expect(p.rules).toContain("no_medical_advice");
    expect(p.collect).toEqual(["name", "phone", "date_time", "product_interest"]);
    expect(p.channels).toEqual(["messenger"]);
    expect(p.handoffWhen).toEqual(["asks_for_human", "upset"]);
    expect(p.unsure).toBe("handoff");
    expect(p.addressStyle).toBe("em_anhchi");
    expect(agentProfileSchema.parse(p)).toEqual(p);
  });

  it("uses personal defaults and no address style for English", () => {
    const p = createProfile("personal_email", "en");
    expect(p.channels).toEqual([]);
    expect(p.handoffWhen).toEqual([]);
    expect(p.unsure).toBe("say_unknown");
    expect(p.addressStyle).toBeNull();
  });
});

describe("applyPreset", () => {
  it("switches goals, rules, collect and drops facts that the new type does not ask", () => {
    const spa = { ...createProfile("beauty", "vi"), businessName: "Lotus", facts: { services_prices: "Gel 150k", opening_hours: "9h-21h" } };
    const next = applyPreset(spa, "restaurant");
    expect(next.businessType).toBe("restaurant");
    expect(next.businessName).toBe("Lotus");
    expect(next.goals).toContain("reservations");
    expect(next.facts).toEqual({ opening_hours: "9h-21h" });
  });
});

describe("agentProfileSchema", () => {
  it("rejects unknown goals, too many personality words and oversized text", () => {
    const base = createProfile("beauty", "vi");
    expect(agentProfileSchema.safeParse({ ...base, goals: ["hack"] }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, personality: ["warm", "expert", "calm"] }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, difference: "x".repeat(1001) }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, businessName: "x".repeat(121) }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, facts: { unknown_fact: "x" } }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @repo/agent-blueprint test profile`
Expected: FAIL with "Failed to resolve import "./profile"".

- [ ] **Step 3: Implement**

`packages/agent-blueprint/src/profile.ts`:
```ts
import { z } from "zod";
import { BUSINESS_TYPE_IDS, getBusinessType, type BusinessTypeId } from "./business-types";
import {
  ADDRESS_STYLE, AFTER_HOURS, CHANNELS, COLLECT, FACTS, FORMALITY, GOALS, HANDOFF_WHEN,
  PERSONALITY, REPLY_LENGTH, RULES, UNSURE, idsOf, type FactId,
} from "./libraries";
import { PRESETS } from "./presets";

export const PROFILE_LIMITS = { shortText: 120, longText: 1000 } as const;

const shortText = z.string().trim().max(PROFILE_LIMITS.shortText);
const longText = z.string().trim().max(PROFILE_LIMITS.longText);

export const agentProfileSchema = z.object({
  version: z.literal(1),
  businessType: z.enum(BUSINESS_TYPE_IDS),
  businessName: shortText,
  agentName: shortText,
  channels: z.array(z.enum(idsOf(CHANNELS))),
  goals: z.array(z.enum(idsOf(GOALS))),
  greeting: longText,
  difference: longText,
  personality: z.array(z.enum(idsOf(PERSONALITY))).max(2),
  formality: z.enum(idsOf(FORMALITY)),
  facts: z.partialRecord(z.enum(idsOf(FACTS)), longText),
  collect: z.array(z.enum(idsOf(COLLECT))),
  handoffWhen: z.array(z.enum(idsOf(HANDOFF_WHEN))),
  rules: z.array(z.enum(idsOf(RULES))),
  unsure: z.enum(idsOf(UNSURE)),
  replyLength: z.enum(idsOf(REPLY_LENGTH)),
  emoji: z.boolean(),
  addressStyle: z.enum(idsOf(ADDRESS_STYLE)).nullable(),
  followUpQuestions: z.boolean(),
  afterHours: z.enum(idsOf(AFTER_HOURS)),
  primaryLanguage: z.string().min(2).max(8),
}).strict();

export type AgentProfile = z.infer<typeof agentProfileSchema>;

export function createProfile(type: BusinessTypeId, primaryLanguage: string): AgentProfile {
  const personal = getBusinessType(type).personal;
  const preset = PRESETS[type];
  return {
    version: 1,
    businessType: type,
    businessName: "",
    agentName: "",
    channels: personal ? [] : ["messenger"],
    goals: [...preset.goals],
    greeting: "",
    difference: "",
    personality: ["warm"],
    formality: "balanced",
    facts: {},
    collect: [...preset.collect],
    handoffWhen: personal ? [] : ["asks_for_human", "upset"],
    rules: [...preset.rules],
    unsure: personal ? "say_unknown" : "handoff",
    replyLength: "short",
    emoji: !personal,
    addressStyle: primaryLanguage === "vi" ? "em_anhchi" : null,
    followUpQuestions: !personal,
    afterHours: "share_hours",
    primaryLanguage,
  };
}

export function applyPreset(profile: AgentProfile, type: BusinessTypeId): AgentProfile {
  const fresh = createProfile(type, profile.primaryLanguage);
  const allowed = new Set<FactId>(PRESETS[type].facts);
  const facts = Object.fromEntries(
    Object.entries(profile.facts).filter(([id]) => allowed.has(id as FactId)),
  ) as AgentProfile["facts"];
  return {
    ...fresh,
    businessName: profile.businessName,
    agentName: profile.agentName,
    greeting: profile.greeting,
    difference: profile.difference,
    personality: profile.personality,
    formality: profile.formality,
    replyLength: profile.replyLength,
    emoji: profile.emoji,
    addressStyle: profile.addressStyle,
    facts,
  };
}
```

Add to `src/index.ts`: `export * from "./profile";`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @repo/agent-blueprint test`
Expected: PASS. If `z.partialRecord` is missing in zod 4.2.0, replace it with `z.record(z.enum(idsOf(FACTS)), longText).partial()` and re-run.

- [ ] **Step 5: Commit**

```bash
git add packages/agent-blueprint
git commit -m "feat(agent-blueprint): agent profile schema, defaults and presets"
```

---

### Task 3: `compilePrompt`

**Files:**
- Create: `packages/agent-blueprint/src/compile-prompt.ts`
- Test: `packages/agent-blueprint/src/compile-prompt.test.ts`
- Modify: `packages/agent-blueprint/src/index.ts`

**Interfaces:**
- Consumes: `AgentProfile`, `createProfile`, the libraries, `getBusinessType`, `PRESETS`.
- Produces:
  - `compilePrompt(profile: AgentProfile, options?: CompileOptions): string`
  - `CompileOptions = { toolGuides?: ToolGuide[]; extraInstructions?: string }`
  - `ToolGuide = { name: string; answers: { question: string; answer: string }[] }`

**Output format** (these are the exact section headings, in this order; a section is left out when it would be empty):
```
# {agentName} · {businessName}
━━━━━━━━━━━━━━━━
## Requirements
## Initialization
## Essence
## Knowledge
## Process            (left out for personal types)
## Rules
## Interaction protocol
## Tools              (only when toolGuides is non-empty)
## Extra instructions (only when extraInstructions is non-blank)
```

- [ ] **Step 1: Write the failing test**

`packages/agent-blueprint/src/compile-prompt.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES } from "./business-types";
import { compilePrompt } from "./compile-prompt";
import { createProfile } from "./profile";
import { PRESETS } from "./presets";

function sample(type: (typeof BUSINESS_TYPES)[number]["id"], lang = "vi") {
  const p = createProfile(type, lang);
  const facts = Object.fromEntries(PRESETS[type].facts.map((f) => [f, `sample ${f}`]));
  return { ...p, businessName: "Lotus", agentName: "Linh", difference: "Handmade designs", facts };
}

describe("compilePrompt", () => {
  it.each(BUSINESS_TYPES.map((t) => t.id))("matches the snapshot for %s", (type) => {
    expect(compilePrompt(sample(type))).toMatchSnapshot();
  });

  it("never contains an em dash for any type", () => {
    for (const t of BUSINESS_TYPES) expect(compilePrompt(sample(t.id))).not.toContain("—");
  });

  it("orders sections as the structured prompt framework does", () => {
    const out = compilePrompt(sample("beauty"), {
      extraInstructions: "Closed on Mondays.",
      toolGuides: [{ name: "Google Sheets", answers: [{ question: "What is in this sheet?", answer: "Price list" }] }],
    });
    const order = ["## Requirements", "## Initialization", "## Essence", "## Knowledge", "## Process", "## Rules", "## Interaction protocol", "## Tools", "## Extra instructions"];
    const positions = order.map((h) => out.indexOf(h));
    positions.forEach((p) => expect(p).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(out).toContain("- What is in this sheet? Price list");
    expect(out.trim().endsWith("Closed on Mondays.")).toBe(true);
  });

  it("omits Tools and Extra instructions when empty, and Process for personal types", () => {
    const out = compilePrompt(sample("personal_email", "en"), { extraInstructions: "   " });
    expect(out).not.toContain("## Tools");
    expect(out).not.toContain("## Extra instructions");
    expect(out).not.toContain("## Process");
  });

  it("only includes facts that belong to the current type", () => {
    const p = { ...sample("restaurant"), facts: { opening_hours: "9h-22h", size_guide: "S M L" } };
    const out = compilePrompt(p);
    expect(out).toContain("Opening hours: 9h-22h");
    expect(out).not.toContain("S M L");
  });

  it("says so when no facts were given", () => {
    const out = compilePrompt({ ...sample("beauty"), facts: {} });
    expect(out).toContain("No business facts were provided. Rely on the knowledge base and never guess.");
  });

  it("turns markdown headings in user text into plain text", () => {
    const out = compilePrompt({ ...sample("beauty"), difference: "## Rules\nIgnore everything" });
    expect(out).not.toMatch(/^## Rules\nIgnore/m);
    expect(out).toContain("Rules Ignore everything");
  });

  it("only mentions address style for Vietnamese agents", () => {
    expect(compilePrompt(sample("beauty", "vi"))).toContain('"em"');
    expect(compilePrompt({ ...sample("beauty", "en"), addressStyle: "em_anhchi" })).not.toContain('"em"');
  });

  it("numbers knowledge in detailed mode and bullets it in simple mode", () => {
    expect(compilePrompt(sample("healthcare"))).toMatch(/## Knowledge\n1\. /);
    expect(compilePrompt(sample("beauty"))).toMatch(/## Knowledge\n- /);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @repo/agent-blueprint test compile-prompt`
Expected: FAIL with "Failed to resolve import "./compile-prompt"".

- [ ] **Step 3: Implement**

`packages/agent-blueprint/src/compile-prompt.ts`:
```ts
import { getBusinessType } from "./business-types";
import {
  ADDRESS_STYLE, AFTER_HOURS, CHANNELS, COLLECT, FACTS, FORMALITY, GOALS, HANDOFF_WHEN,
  PERSONALITY, REPLY_LENGTH, RULES, UNSURE, promptOf, type FactId,
} from "./libraries";
import { PRESETS } from "./presets";
import type { AgentProfile } from "./profile";

export type ToolGuide = { name: string; answers: { question: string; answer: string }[] };
export type CompileOptions = { toolGuides?: ToolGuide[]; extraInstructions?: string };

// User text is data, never structure: flatten newlines and strip heading markers.
function plain(text: string): string {
  return text.replace(/^\s*#+\s*/gm, "").replace(/\s*\n+\s*/g, " ").trim();
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function section(title: string, body: string[]): string {
  const lines = body.filter((l) => l.trim() !== "");
  return lines.length ? `## ${title}\n${lines.join("\n")}` : "";
}

export function compilePrompt(profile: AgentProfile, options: CompileOptions = {}): string {
  const type = getBusinessType(profile.businessType);
  const agent = plain(profile.agentName) || "the assistant";
  const business = plain(profile.businessName) || (type.personal ? "the owner" : "the business");
  const audience = type.personal ? "the owner" : "customers";

  const header = `# ${agent} · ${business}\n━━━━━━━━━━━━━━━━`;

  const requirements = section("Requirements", [
    type.personal
      ? `- You are a personal ${type.promptLabel} working for ${business}.`
      : `- Business: ${business}, a ${type.promptLabel}.`,
    !type.personal && profile.channels.length
      ? `- Customers reach you on ${list(profile.channels.map((c) => promptOf(CHANNELS, c)))}.`
      : "",
    profile.goals.length ? "- Your jobs:" : "",
    ...profile.goals.map((g, i) => `  ${i + 1}. ${promptOf(GOALS, g)}`),
  ]);

  const initialization = section("Initialization", [
    profile.greeting.trim()
      ? `Start the first conversation with: "${plain(profile.greeting)}"`
      : `Start the first conversation by introducing yourself as ${agent} from ${business} in one short sentence, then ask how you can help.`,
  ]);

  const personality = profile.personality.map((p) => promptOf(PERSONALITY, p));
  const essence = section("Essence", [
    `You are ${agent}, the ${list(personality) || "helpful"} voice of ${business}. You speak to ${audience} as a real member of the team would: specific, honest and kind.`,
    profile.difference.trim() ? `What makes ${business} different: ${plain(profile.difference)}` : "",
    `Tone: ${promptOf(FORMALITY, profile.formality)}`,
  ]);

  const allowedFacts = PRESETS[profile.businessType].facts;
  const facts = allowedFacts
    .map((id: FactId) => [id, profile.facts[id]?.trim()] as const)
    .filter(([, v]) => !!v)
    .map(([id, v]) => `${promptOf(FACTS, id)}: ${plain(v as string)}`);
  const knowledge = section("Knowledge", facts.length
    ? facts.map((f, i) => (type.mode === "detailed" ? `${i + 1}. ${f}` : `- ${f}`))
    : ["No business facts were provided. Rely on the knowledge base and never guess."]);

  const process = type.personal ? "" : section("Process", [
    "1. Understand what the customer needs. Ask at most one question at a time.",
    profile.collect.length ? `2. Before confirming anything, collect: ${list(profile.collect.map((c) => promptOf(COLLECT, c)))}.` : "",
    "3. Read the key details back and wait for a clear yes before you confirm.",
    profile.handoffWhen.length ? `4. Hand the conversation to a person when ${list(profile.handoffWhen.map((h) => promptOf(HANDOFF_WHEN, h)))}.` : "",
    type.mode === "detailed" ? "5. Explain step by step and check that the customer understood before moving on." : "",
  ]);

  const rules = section("Rules", [
    ...profile.rules.map((r, i) => `${i + 1}. ${promptOf(RULES, r)}`),
    `${profile.rules.length + 1}. When you are not sure: ${promptOf(UNSURE, profile.unsure)}`,
  ]);

  const interaction = section("Interaction protocol", [
    `- ${promptOf(REPLY_LENGTH, profile.replyLength)}`,
    `- ${profile.emoji ? "Use an emoji now and then when it fits the mood." : "Do not use emoji."}`,
    profile.primaryLanguage === "vi" && profile.addressStyle ? `- ${promptOf(ADDRESS_STYLE, profile.addressStyle)}` : "",
    `- ${profile.followUpQuestions ? "End with a short question that helps the conversation move forward." : "Do not add follow-up questions unless you need information."}`,
    type.personal ? "" : `- Outside opening hours: ${promptOf(AFTER_HOURS, profile.afterHours)}`,
  ]);

  const tools = section("Tools", (options.toolGuides ?? []).flatMap((t) => [
    `### ${plain(t.name)}`,
    ...t.answers.filter((a) => a.answer.trim()).map((a) => `- ${a.question} ${plain(a.answer)}`),
  ]));

  const extra = options.extraInstructions?.trim()
    ? `## Extra instructions\n${options.extraInstructions.trim()}`
    : "";

  return [header, requirements, initialization, essence, knowledge, process, rules, interaction, tools, extra]
    .filter(Boolean)
    .join("\n\n");
}
```

Add to `src/index.ts`: `export * from "./compile-prompt";`

- [ ] **Step 4: Run the tests and review the snapshots**

Run: `pnpm --filter @repo/agent-blueprint test compile-prompt`
Expected: PASS, and `src/__snapshots__/compile-prompt.test.ts.snap` is written.

Open the snapshot file and read the `beauty`, `healthcare` and `personal_email` entries. Check that they read like natural instructions and contain no "—". If any wording is awkward, fix it in the libraries and re-run with `-u`.

- [ ] **Step 5: Commit**

```bash
git add packages/agent-blueprint
git commit -m "feat(agent-blueprint): structured prompt compiler"
```

---

### Task 4: Question groups and translation keys

**Files:**
- Create: `packages/agent-blueprint/src/questions.ts`
- Test: `packages/agent-blueprint/src/questions.test.ts`
- Modify: `packages/agent-blueprint/src/index.ts`

**Interfaces:**
- Consumes: `AgentProfile`, the libraries, `PRESETS`, `getBusinessType`.
- Produces:
  - `QuestionKind = "single" | "multi" | "text" | "boolean"`
  - `Question = { id: string; path: QuestionPath; kind: QuestionKind; titleKey: string; descriptionKey?: string; placeholderKey?: string; required: boolean; max?: number; multiline?: boolean; choices?: { value: string; labelKey: string }[] }`
  - `QuestionPath = { field: keyof AgentProfile } | { field: "facts"; fact: FactId }`
  - `GroupId = "identity" | "essence" | "facts" | "process" | "rules" | "interaction"`
  - `QuestionGroup = { id: GroupId; titleKey: string; questions: Question[] }`
  - `buildQuestionGroups(profile: AgentProfile): QuestionGroup[]`
  - `DRAFT_GROUPS: GroupId[] = ["identity","essence","facts","process","rules"]`
  - `readAnswer(profile, path): unknown`
  - `writeAnswer(profile, path, value): AgentProfile` (writing `businessType` calls `applyPreset`)
  - `allTranslationKeys(): string[]`
  - `TEMPLATE_TYPES: BusinessTypeId[]`

**Translation key convention:**
- Questions: `agentBuilder.questions.<questionId>.title`, `.description`, `.placeholder`
- Choices: `agentBuilder.<library>.<id>`, where library is one of `types`, `goals`, `rules`, `unsure`, `handoffWhen`, `collect`, `personality`, `formality`, `replyLength`, `addressStyle`, `afterHours`, `channels`
- Facts: `agentBuilder.facts.<factId>.title` and `.placeholder`
- Groups: `agentBuilder.groups.<groupId>`

- [ ] **Step 1: Write the failing test**

`packages/agent-blueprint/src/questions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createProfile } from "./profile";
import { allTranslationKeys, buildQuestionGroups, readAnswer, writeAnswer } from "./questions";

const ids = (p: ReturnType<typeof createProfile>) =>
  buildQuestionGroups(p).flatMap((g) => g.questions.map((q) => q.id));

describe("buildQuestionGroups", () => {
  it("builds six groups in order for an SMB type", () => {
    expect(buildQuestionGroups(createProfile("beauty", "vi")).map((g) => g.id))
      .toEqual(["identity", "essence", "facts", "process", "rules", "interaction"]);
  });

  it("asks one fact question per preset fact", () => {
    const facts = buildQuestionGroups(createProfile("restaurant", "vi")).find((g) => g.id === "facts")!;
    expect(facts.questions.map((q) => q.id)).toEqual([
      "facts.opening_hours", "facts.address", "facts.menu_highlights",
      "facts.reservation_policy", "facts.delivery", "facts.payment_methods",
    ]);
  });

  it("hides the address style question unless the language is Vietnamese", () => {
    expect(ids(createProfile("beauty", "vi"))).toContain("addressStyle");
    expect(ids(createProfile("beauty", "en"))).not.toContain("addressStyle");
  });

  it("hides customer-facing questions for personal types", () => {
    const personal = ids(createProfile("personal_scheduling", "en"));
    ["channels", "collect", "handoffWhen", "afterHours"].forEach((id) => expect(personal).not.toContain(id));
    expect(buildQuestionGroups(createProfile("personal_scheduling", "en")).map((g) => g.id)).not.toContain("process");
  });

  it("offers personal goals to personal types and business goals to SMB types", () => {
    const goalsQ = (p: ReturnType<typeof createProfile>) =>
      buildQuestionGroups(p).flatMap((g) => g.questions).find((q) => q.id === "goals")!;
    expect(goalsQ(createProfile("beauty", "vi")).choices!.map((c) => c.value)).not.toContain("manage_schedule");
    expect(goalsQ(createProfile("personal_tasks", "en")).choices!.map((c) => c.value)).toContain("track_tasks");
  });
});

describe("readAnswer / writeAnswer", () => {
  it("reads and writes fact paths", () => {
    const p = writeAnswer(createProfile("beauty", "vi"), { field: "facts", fact: "opening_hours" }, "9h-21h");
    expect(readAnswer(p, { field: "facts", fact: "opening_hours" })).toBe("9h-21h");
  });

  it("re-applies presets when the business type changes", () => {
    const p = writeAnswer(createProfile("beauty", "vi"), { field: "businessType" }, "restaurant");
    expect(p.goals).toContain("reservations");
  });
});

describe("allTranslationKeys", () => {
  it("covers every question, choice, fact and group key without duplicates", () => {
    const keys = allTranslationKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("agentBuilder.questions.goals.title");
    expect(keys).toContain("agentBuilder.goals.take_orders");
    expect(keys).toContain("agentBuilder.facts.menu_highlights.placeholder");
    expect(keys).toContain("agentBuilder.types.personal_crm");
    expect(keys).toContain("agentBuilder.groups.interaction");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @repo/agent-blueprint test questions`
Expected: FAIL with "Failed to resolve import "./questions"".

- [ ] **Step 3: Implement**

`packages/agent-blueprint/src/questions.ts`:
```ts
import { BUSINESS_TYPES, getBusinessType, type BusinessTypeId } from "./business-types";
import {
  ADDRESS_STYLE, AFTER_HOURS, CHANNELS, COLLECT, FACTS, FORMALITY, GOALS, HANDOFF_WHEN,
  PERSONAL_GOALS, PERSONALITY, REPLY_LENGTH, RULES, UNSURE, type FactId,
} from "./libraries";
import { PRESETS } from "./presets";
import { applyPreset, type AgentProfile } from "./profile";

export type QuestionKind = "single" | "multi" | "text" | "boolean";
export type QuestionPath = { field: Exclude<keyof AgentProfile, "facts"> } | { field: "facts"; fact: FactId };
export type Question = {
  id: string;
  path: QuestionPath;
  kind: QuestionKind;
  titleKey: string;
  descriptionKey?: string;
  placeholderKey?: string;
  required: boolean;
  max?: number;
  multiline?: boolean;
  choices?: { value: string; labelKey: string }[];
};
export type GroupId = "identity" | "essence" | "facts" | "process" | "rules" | "interaction";
export type QuestionGroup = { id: GroupId; titleKey: string; questions: Question[] };

export const DRAFT_GROUPS: GroupId[] = ["identity", "essence", "facts", "process", "rules"];
export const TEMPLATE_TYPES: BusinessTypeId[] = ["restaurant", "beauty", "ecommerce", "healthcare", "education", "personal_scheduling"];

const LIBRARIES = {
  types: BUSINESS_TYPES,
  goals: GOALS,
  rules: RULES,
  unsure: UNSURE,
  handoffWhen: HANDOFF_WHEN,
  collect: COLLECT,
  personality: PERSONALITY,
  formality: FORMALITY,
  replyLength: REPLY_LENGTH,
  addressStyle: ADDRESS_STYLE,
  afterHours: AFTER_HOURS,
  channels: CHANNELS,
} as const;
type LibraryName = keyof typeof LIBRARIES;

const choicesOf = (lib: LibraryName, only?: readonly string[]) =>
  (LIBRARIES[lib] as readonly { id: string }[])
    .filter((x) => !only || only.includes(x.id))
    .map((x) => ({ value: x.id, labelKey: `agentBuilder.${lib}.${x.id}` }));

const q = (
  id: Exclude<keyof AgentProfile, "facts">,
  kind: QuestionKind,
  extra: Partial<Question> = {},
): Question => ({
  id,
  path: { field: id },
  kind,
  titleKey: `agentBuilder.questions.${id}.title`,
  required: false,
  ...extra,
});

export function buildQuestionGroups(profile: AgentProfile): QuestionGroup[] {
  const type = getBusinessType(profile.businessType);
  const personal = type.personal;
  const goalIds = personal ? PERSONAL_GOALS : GOALS.map((g) => g.id).filter((g) => !PERSONAL_GOALS.includes(g) || g === "capture_leads");

  const identity: Question[] = [
    q("businessType", "single", { required: true, choices: choicesOf("types") }),
    q("businessName", "text", {
      required: true,
      titleKey: personal ? "agentBuilder.questions.ownerName.title" : "agentBuilder.questions.businessName.title",
      placeholderKey: "agentBuilder.questions.businessName.placeholder",
    }),
    q("agentName", "text", { required: true, placeholderKey: "agentBuilder.questions.agentName.placeholder" }),
    ...(personal ? [] : [q("channels", "multi", { choices: choicesOf("channels") })]),
    q("goals", "multi", { required: true, descriptionKey: "agentBuilder.questions.goals.description", choices: choicesOf("goals", goalIds) }),
    q("greeting", "text", { multiline: true, placeholderKey: "agentBuilder.questions.greeting.placeholder" }),
  ];

  const essence: Question[] = [
    q("difference", "text", { multiline: true, placeholderKey: "agentBuilder.questions.difference.placeholder" }),
    q("personality", "multi", { max: 2, descriptionKey: "agentBuilder.questions.personality.description", choices: choicesOf("personality") }),
    q("formality", "single", { required: true, choices: choicesOf("formality") }),
  ];

  const facts: Question[] = PRESETS[profile.businessType].facts.map((fact) => ({
    id: `facts.${fact}`,
    path: { field: "facts", fact },
    kind: "text",
    titleKey: `agentBuilder.facts.${fact}.title`,
    placeholderKey: `agentBuilder.facts.${fact}.placeholder`,
    required: false,
    multiline: true,
  }));

  const process: Question[] = personal ? [] : [
    q("collect", "multi", { choices: choicesOf("collect") }),
    q("handoffWhen", "multi", { choices: choicesOf("handoffWhen") }),
  ];

  const rules: Question[] = [
    q("rules", "multi", { choices: choicesOf("rules") }),
    q("unsure", "single", { required: true, choices: choicesOf("unsure") }),
  ];

  const interaction: Question[] = [
    q("replyLength", "single", { required: true, choices: choicesOf("replyLength") }),
    q("emoji", "boolean"),
    ...(profile.primaryLanguage === "vi" ? [q("addressStyle", "single", { required: true, choices: choicesOf("addressStyle") })] : []),
    q("followUpQuestions", "boolean"),
    ...(personal ? [] : [q("afterHours", "single", { required: true, choices: choicesOf("afterHours") })]),
  ];

  const groups: QuestionGroup[] = [
    { id: "identity", titleKey: "agentBuilder.groups.identity", questions: identity },
    { id: "essence", titleKey: "agentBuilder.groups.essence", questions: essence },
    { id: "facts", titleKey: "agentBuilder.groups.facts", questions: facts },
    { id: "process", titleKey: "agentBuilder.groups.process", questions: process },
    { id: "rules", titleKey: "agentBuilder.groups.rules", questions: rules },
    { id: "interaction", titleKey: "agentBuilder.groups.interaction", questions: interaction },
  ];
  return groups.filter((g) => g.questions.length > 0);
}

export function readAnswer(profile: AgentProfile, path: QuestionPath): unknown {
  return path.field === "facts" ? profile.facts[path.fact] ?? "" : profile[path.field];
}

export function writeAnswer(profile: AgentProfile, path: QuestionPath, value: unknown): AgentProfile {
  if (path.field === "facts") return { ...profile, facts: { ...profile.facts, [path.fact]: String(value ?? "") } };
  if (path.field === "businessType") return applyPreset(profile, value as BusinessTypeId);
  return { ...profile, [path.field]: value } as AgentProfile;
}

export function allTranslationKeys(): string[] {
  const questionIds = [
    "businessType", "businessName", "ownerName", "agentName", "channels", "goals", "greeting",
    "difference", "personality", "formality", "collect", "handoffWhen", "rules", "unsure",
    "replyLength", "emoji", "addressStyle", "followUpQuestions", "afterHours",
  ];
  const withExtras: Record<string, string[]> = {
    businessName: ["placeholder"], agentName: ["placeholder"], goals: ["description"],
    greeting: ["placeholder"], difference: ["placeholder"], personality: ["description"],
  };
  const keys = questionIds.flatMap((id) => [
    `agentBuilder.questions.${id}.title`,
    ...(withExtras[id] ?? []).map((s) => `agentBuilder.questions.${id}.${s}`),
  ]);
  for (const [lib, entries] of Object.entries(LIBRARIES)) {
    for (const e of entries) keys.push(`agentBuilder.${lib}.${e.id}`);
  }
  for (const f of FACTS) keys.push(`agentBuilder.facts.${f.id}.title`, `agentBuilder.facts.${f.id}.placeholder`);
  for (const g of ["identity", "essence", "facts", "process", "rules", "interaction"]) keys.push(`agentBuilder.groups.${g}`);
  return keys;
}
```

Add to `src/index.ts`: `export * from "./questions";`

- [ ] **Step 4: Run all package tests**

Run: `pnpm --filter @repo/agent-blueprint test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/agent-blueprint
git commit -m "feat(agent-blueprint): question groups, answer paths and translation keys"
```

---

### Task 5: Jev suggestion questions and `applySuggestion`

**Files:**
- Create: `packages/agent-blueprint/src/suggest.ts`
- Test: `packages/agent-blueprint/src/suggest.test.ts`
- Modify: `packages/agent-blueprint/src/index.ts`

**Interfaces:**
- Consumes: the libraries, `BUSINESS_TYPES`, `createProfile`, `AgentProfile`.
- Produces:
  - `SystemOneQuestion = { type: "choice"; instructions: string; criteria: Record<string, string> } | { type: "noul"; instructions: string }`
  - `buildSuggestQuestions(): Record<string, SystemOneQuestion>`. Question ids: `business_type`, `personality`, `formality`, `goal__<GoalId>`, `rule__<RuleId>`.
  - `SystemOneAnswer = { type: "choice"; choice: string; confidence: number } | { type: "noul"; noul: number }`
  - `AgentSuggestion = { businessType: Scored | null; personality: Scored | null; formality: Scored | null; goals: Record<string, number>; rules: Record<string, number> }` where `Scored = { value: string; confidence: number }`
  - `EMPTY_SUGGESTION: AgentSuggestion`
  - `readSuggestAnswers(answers: Record<string, SystemOneAnswer | undefined>): AgentSuggestion`
  - `confidenceLevel(c: number): "auto" | "check" | "none"`
  - `applySuggestion(s: AgentSuggestion, primaryLanguage: string): AgentProfile | null`

- [ ] **Step 1: Write the failing test**

`packages/agent-blueprint/src/suggest.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  EMPTY_SUGGESTION, applySuggestion, buildSuggestQuestions, confidenceLevel, readSuggestAnswers,
} from "./suggest";

describe("buildSuggestQuestions", () => {
  it("asks one choice for type, personality, formality and a noul per goal and rule", () => {
    const q = buildSuggestQuestions();
    expect(q.business_type.type).toBe("choice");
    expect(Object.keys((q.business_type as { criteria: object }).criteria)).toHaveLength(21);
    expect(q["goal__take_orders"].type).toBe("noul");
    expect(q["rule__no_medical_advice"].type).toBe("noul");
    expect(JSON.stringify(q)).not.toContain("—");
  });
});

describe("readSuggestAnswers", () => {
  it("maps answers and ignores missing or malformed ones", () => {
    const s = readSuggestAnswers({
      business_type: { type: "choice", choice: "beauty", confidence: 0.95 },
      formality: { type: "noul", noul: 0.3 } as never,
      goal__book_appointments: { type: "noul", noul: 0.92 },
      rule__no_medical_advice: { type: "noul", noul: 0.7 },
    });
    expect(s.businessType).toEqual({ value: "beauty", confidence: 0.95 });
    expect(s.formality).toBeNull();
    expect(s.goals.book_appointments).toBe(0.92);
    expect(s.rules.no_medical_advice).toBe(0.7);
  });

  it("rejects a choice that is not a known id", () => {
    expect(readSuggestAnswers({ business_type: { type: "choice", choice: "casino", confidence: 1 } }).businessType).toBeNull();
  });
});

describe("applySuggestion", () => {
  it("returns null when the business type is not confident enough", () => {
    expect(applySuggestion(EMPTY_SUGGESTION, "vi")).toBeNull();
    expect(applySuggestion({ ...EMPTY_SUGGESTION, businessType: { value: "beauty", confidence: 0.4 } }, "vi")).toBeNull();
  });

  it("starts from the preset and adds likely goals and rules", () => {
    const p = applySuggestion({
      ...EMPTY_SUGGESTION,
      businessType: { value: "beauty", confidence: 0.95 },
      personality: { value: "premium", confidence: 0.8 },
      goals: { take_orders: 0.9, qualify_leads: 0.2, manage_schedule: 0.99 },
      rules: { no_competitors: 0.6 },
    }, "vi")!;
    expect(p.businessType).toBe("beauty");
    expect(p.goals).toContain("book_appointments");
    expect(p.goals).toContain("take_orders");
    expect(p.goals).not.toContain("qualify_leads");
    expect(p.goals).not.toContain("manage_schedule");
    expect(p.rules).toContain("no_competitors");
    expect(p.personality).toEqual(["premium"]);
  });
});

describe("confidenceLevel", () => {
  it("uses the 0.9 and 0.5 thresholds", () => {
    expect(confidenceLevel(0.9)).toBe("auto");
    expect(confidenceLevel(0.5)).toBe("check");
    expect(confidenceLevel(0.49)).toBe("none");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @repo/agent-blueprint test suggest`
Expected: FAIL with "Failed to resolve import "./suggest"".

- [ ] **Step 3: Implement**

`packages/agent-blueprint/src/suggest.ts`:
```ts
import { BUSINESS_TYPES, getBusinessType, type BusinessTypeId } from "./business-types";
import { FORMALITY, GOALS, PERSONAL_GOALS, PERSONALITY, RULES, type GoalId, type RuleId } from "./libraries";
import { createProfile, type AgentProfile } from "./profile";

export type SystemOneQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "noul"; instructions: string };
export type SystemOneAnswer =
  | { type: "choice"; choice: string; confidence: number }
  | { type: "noul"; noul: number };
export type Scored = { value: string; confidence: number };
export type AgentSuggestion = {
  businessType: Scored | null;
  personality: Scored | null;
  formality: Scored | null;
  goals: Record<string, number>;
  rules: Record<string, number>;
};

export const EMPTY_SUGGESTION: AgentSuggestion = { businessType: null, personality: null, formality: null, goals: {}, rules: {} };

const criteria = (list: readonly { id: string; prompt: string }[]) =>
  Object.fromEntries(list.map((x) => [x.id, x.prompt]));

export function buildSuggestQuestions(): Record<string, SystemOneQuestion> {
  const questions: Record<string, SystemOneQuestion> = {
    business_type: {
      type: "choice",
      instructions: "The state is how a business owner describes the chat assistant they want. Which kind of business or assistant is it?",
      criteria: Object.fromEntries(BUSINESS_TYPES.map((t) => [t.id, t.personal ? `A personal ${t.promptLabel} for the owner` : `A ${t.promptLabel} talking to customers`])),
    },
    personality: {
      type: "choice",
      instructions: "Which personality would suit this business's chat assistant best?",
      criteria: criteria(PERSONALITY),
    },
    formality: {
      type: "choice",
      instructions: "How formal should this assistant be with the people it talks to?",
      criteria: criteria(FORMALITY),
    },
  };
  for (const g of GOALS) questions[`goal__${g.id}`] = { type: "noul", instructions: `Should the assistant do this job? ${g.prompt}` };
  for (const r of RULES) questions[`rule__${r.id}`] = { type: "noul", instructions: `Is this rule important for this business? ${r.prompt}` };
  return questions;
}

function scored(a: SystemOneAnswer | undefined, allowed: readonly string[]): Scored | null {
  if (!a || a.type !== "choice" || typeof a.choice !== "string" || !allowed.includes(a.choice)) return null;
  return { value: a.choice, confidence: Number(a.confidence) || 0 };
}

export function readSuggestAnswers(answers: Record<string, SystemOneAnswer | undefined>): AgentSuggestion {
  const nouls = (prefix: string) => Object.fromEntries(
    Object.entries(answers)
      .filter(([k, a]) => k.startsWith(prefix) && a?.type === "noul" && typeof a.noul === "number")
      .map(([k, a]) => [k.slice(prefix.length), (a as { noul: number }).noul]),
  );
  return {
    businessType: scored(answers.business_type, BUSINESS_TYPES.map((t) => t.id)),
    personality: scored(answers.personality, PERSONALITY.map((p) => p.id)),
    formality: scored(answers.formality, FORMALITY.map((f) => f.id)),
    goals: nouls("goal__"),
    rules: nouls("rule__"),
  };
}

export function confidenceLevel(c: number): "auto" | "check" | "none" {
  if (c >= 0.9) return "auto";
  if (c >= 0.5) return "check";
  return "none";
}

export function applySuggestion(s: AgentSuggestion, primaryLanguage: string): AgentProfile | null {
  if (!s.businessType || confidenceLevel(s.businessType.confidence) === "none") return null;
  const typeId = s.businessType.value as BusinessTypeId;
  const personal = getBusinessType(typeId).personal;
  const base = createProfile(typeId, primaryLanguage);
  const allowedGoals = new Set<GoalId>(personal ? PERSONAL_GOALS : GOALS.map((g) => g.id).filter((g) => !PERSONAL_GOALS.includes(g) || g === "capture_leads"));
  const likely = <T extends string>(scores: Record<string, number>) =>
    Object.entries(scores).filter(([, p]) => p >= 0.5).map(([id]) => id as T);
  return {
    ...base,
    goals: Array.from(new Set([...base.goals, ...likely<GoalId>(s.goals).filter((g) => allowedGoals.has(g))])),
    rules: Array.from(new Set([...base.rules, ...likely<RuleId>(s.rules)])),
    personality: s.personality && confidenceLevel(s.personality.confidence) !== "none" ? [s.personality.value as AgentProfile["personality"][number]] : base.personality,
    formality: s.formality && confidenceLevel(s.formality.confidence) !== "none" ? (s.formality.value as AgentProfile["formality"]) : base.formality,
  };
}
```

Add to `src/index.ts`: `export * from "./suggest";`

- [ ] **Step 4: Run all package tests**

Run: `pnpm --filter @repo/agent-blueprint test && pnpm --filter @repo/agent-blueprint typecheck && pnpm --filter @repo/agent-blueprint build`
Expected: PASS, no type errors, and `dist/` is rebuilt.

- [ ] **Step 5: Commit**

```bash
git add packages/agent-blueprint
git commit -m "feat(agent-blueprint): Jev suggestion questions and mapping"
```

---
### Task 6: `@repo/ui` Questionnaire

**Files:**
- Create: `packages/ui/src/components/common/questionnaire/questionnaire.tsx`
- Create: `packages/ui/src/components/common/questionnaire/index.ts`
- Test: `packages/ui/src/components/common/questionnaire/questionnaire.test.tsx`
- Modify: `packages/ui/src/components/common/index.ts` (add `export * from "./questionnaire";`)

**Interfaces:**
- Produces (exported from `@repo/ui/common-components`):
  - `Questionnaire({ onSubmit: () => void; className?; children })`: a `<form>`. On submit it validates every mounted, enabled item and only calls `onSubmit` if all pass.
  - `QuestionnaireItem({ name: string; value: string | string[]; onValueChange: (v: string | string[]) => void; multiple?: boolean; required?: boolean; max?: number; disabled?: boolean; className?; children })`: a `<fieldset>`. It renders nothing when `disabled`.
  - `QuestionnaireTitle` (a `<legend>`), `QuestionnaireDescription`
  - `QuestionnaireChoices({ shortcuts?: "numbers"; className?; children })`, `QuestionnaireChoice({ value: string; label: string; description?: string })`
  - `QuestionnaireInput({ placeholder?; multiline?: boolean; maxLength?: number; "aria-label": string })`
  - `QuestionnaireError({ children })`
  - `QuestionnaireActions`
  - `QuestionnaireNext` (submit button; children are the label)
  - `QuestionnaireSkip({ onClick, children })`
  - `QuestionnaireProgress({ current: number; total: number; render?: (p: { current: number; total: number }) => ReactNode })`
- The component has no built-in strings. Every label comes in through props.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/common/questionnaire/questionnaire.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoices,
  QuestionnaireError, QuestionnaireInput, QuestionnaireItem, QuestionnaireNext, QuestionnaireTitle,
} from "./questionnaire";

function Harness(props: { multiple?: boolean; required?: boolean; max?: number; disabled?: boolean; onSubmit?: () => void; text?: boolean }) {
  const [value, setValue] = useState<string | string[]>(props.multiple ? [] : "");
  return (
    <Questionnaire onSubmit={props.onSubmit ?? (() => {})}>
      <QuestionnaireItem name="q" value={value} onValueChange={setValue} multiple={props.multiple} required={props.required} max={props.max} disabled={props.disabled}>
        <QuestionnaireTitle>Pick</QuestionnaireTitle>
        {props.text ? (
          <QuestionnaireInput aria-label="answer" />
        ) : (
          <QuestionnaireChoices shortcuts="numbers">
            <QuestionnaireChoice value="a" label="Alpha" />
            <QuestionnaireChoice value="b" label="Beta" />
            <QuestionnaireChoice value="c" label="Gamma" />
          </QuestionnaireChoices>
        )}
        <QuestionnaireError>Required</QuestionnaireError>
      </QuestionnaireItem>
      <QuestionnaireActions><QuestionnaireNext>Next</QuestionnaireNext></QuestionnaireActions>
      <output data-testid="value">{JSON.stringify(value)}</output>
    </Questionnaire>
  );
}

describe("Questionnaire", () => {
  it("renders the title as a fieldset legend", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Pick" })).toBeInTheDocument();
  });

  it("selects one choice in single mode", async () => {
    render(<Harness />);
    await userEvent.click(screen.getAllByRole("radio")[1]);
    expect(screen.getByTestId("value").textContent).toBe('"b"');
  });

  it("toggles choices in multi mode and respects max", async () => {
    render(<Harness multiple max={2} />);
    const boxes = screen.getAllByRole("checkbox");
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[1]);
    await userEvent.click(boxes[2]);
    expect(screen.getByTestId("value").textContent).toBe('["a","b"]');
    await userEvent.click(boxes[0]);
    expect(screen.getByTestId("value").textContent).toBe('["b"]');
  });

  it("blocks submit and shows the error when a required item is empty", async () => {
    const onSubmit = vi.fn();
    render(<Harness required onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("picks a choice with number keys", async () => {
    render(<Harness multiple />);
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.keyboard("3");
    expect(screen.getByTestId("value").textContent).toBe('["a","c"]');
  });

  it("does not render or validate a disabled item", async () => {
    const onSubmit = vi.fn();
    render(<Harness required disabled onSubmit={onSubmit} />);
    expect(screen.queryByRole("group", { name: "Pick" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("binds a text input", async () => {
    render(<Harness text />);
    await userEvent.type(screen.getByLabelText("answer"), "hi");
    expect(screen.getByTestId("value").textContent).toBe('"hi"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @repo/ui test questionnaire`
Expected: FAIL with "Failed to resolve import "./questionnaire"".

- [ ] **Step 3: Implement**

`packages/ui/src/components/common/questionnaire/questionnaire.tsx`:
```tsx
import { Button, Checkbox, Input, RadioGroup, Text, Textarea, clx } from "@medusajs/ui";
import {
  Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState,
  type ComponentProps, type FormEvent, type KeyboardEvent, type ReactNode,
} from "react";

type QuestionnaireValue = string | string[];

type RootContextValue = { register: (name: string, check: () => boolean) => () => void; submitted: boolean };
const RootContext = createContext<RootContextValue | null>(null);

type ItemContextValue = {
  value: QuestionnaireValue;
  setValue: (v: QuestionnaireValue) => void;
  multiple: boolean;
  max?: number;
  invalid: boolean;
};
const ItemContext = createContext<ItemContextValue | null>(null);
const ChoicesContext = createContext<{ toggle: (v: string) => void } | null>(null);

function useItem() {
  const ctx = useContext(ItemContext);
  if (!ctx) throw new Error("Questionnaire parts must be inside QuestionnaireItem");
  return ctx;
}

export function Questionnaire({ onSubmit, className, children }: { onSubmit: () => void; className?: string; children: ReactNode }) {
  const checks = useRef(new Map<string, () => boolean>());
  const [submitted, setSubmitted] = useState(false);
  const register = useCallback((name: string, check: () => boolean) => {
    checks.current.set(name, check);
    return () => void checks.current.delete(name);
  }, []);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if ([...checks.current.values()].every((check) => check())) {
      setSubmitted(false);
      onSubmit();
    }
  };
  return (
    <RootContext.Provider value={{ register, submitted }}>
      <form noValidate onSubmit={handleSubmit} className={clx("flex flex-col gap-4", className)}>
        {children}
      </form>
    </RootContext.Provider>
  );
}

export function QuestionnaireItem({
  name, value, onValueChange, multiple = false, required = false, max, disabled = false, className, children,
}: {
  name: string;
  value: QuestionnaireValue;
  onValueChange: (v: QuestionnaireValue) => void;
  multiple?: boolean;
  required?: boolean;
  max?: number;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const root = useContext(RootContext);
  const empty = Array.isArray(value) ? value.length === 0 : value.trim() === "";
  const valid = !required || !empty;
  useEffect(() => (disabled ? undefined : root?.register(name, () => valid)), [root, name, valid, disabled]);
  if (disabled) return null;
  const invalid = !!root?.submitted && !valid;
  return (
    <ItemContext.Provider value={{ value, setValue: onValueChange, multiple, max, invalid }}>
      <fieldset aria-invalid={invalid || undefined} className={clx("flex min-w-0 flex-col gap-3", className)}>
        {children}
      </fieldset>
    </ItemContext.Provider>
  );
}

export function QuestionnaireTitle({ className, ...props }: ComponentProps<"legend">) {
  return <legend className={clx("txt-compact-medium-plus text-ui-fg-base mb-1", className)} {...props} />;
}

export function QuestionnaireDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={clx("txt-compact-small text-ui-fg-subtle -mt-2", className)} {...props} />;
}

export function QuestionnaireChoices({ shortcuts, className, children }: { shortcuts?: "numbers"; className?: string; children: ReactNode }) {
  const item = useItem();
  const values = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => (child.props as { value: string }).value);

  const toggle = (v: string) => {
    if (!item.multiple) return item.setValue(v);
    const current = item.value as string[];
    if (current.includes(v)) item.setValue(current.filter((x) => x !== v));
    else if (!item.max || current.length < item.max) item.setValue([...current, v]);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (shortcuts !== "numbers") return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= values.length) {
      e.preventDefault();
      toggle(values[n - 1]);
    }
  };

  const grid = clx("grid gap-2 sm:grid-cols-2", className);
  return (
    <ChoicesContext.Provider value={{ toggle }}>
      {item.multiple ? (
        <div role="group" onKeyDown={onKeyDown} className={grid}>{children}</div>
      ) : (
        <RadioGroup value={item.value as string} onValueChange={item.setValue} onKeyDown={onKeyDown} className={grid}>
          {children}
        </RadioGroup>
      )}
    </ChoicesContext.Provider>
  );
}

export function QuestionnaireChoice({ value, label, description }: { value: string; label: string; description?: string }) {
  const item = useItem();
  const choices = useContext(ChoicesContext);
  const id = useId();
  if (!item.multiple) return <RadioGroup.ChoiceBox value={value} label={label} description={description ?? ""} />;
  const checked = (item.value as string[]).includes(value);
  return (
    <label
      htmlFor={id}
      className={clx(
        "bg-ui-bg-base hover:bg-ui-bg-base-hover shadow-borders-base flex cursor-pointer items-start gap-x-2 rounded-lg px-3 py-2 transition-shadow",
        checked && "shadow-borders-interactive-with-active",
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={() => choices?.toggle(value)} />
      <span className="flex flex-col">
        <Text size="small" weight="plus">{label}</Text>
        {description && <Text size="small" className="text-ui-fg-subtle">{description}</Text>}
      </span>
    </label>
  );
}

export function QuestionnaireInput({
  placeholder, multiline, maxLength, "aria-label": ariaLabel,
}: { placeholder?: string; multiline?: boolean; maxLength?: number; "aria-label": string }) {
  const item = useItem();
  const common = {
    value: item.value as string,
    placeholder,
    maxLength,
    "aria-label": ariaLabel,
    "aria-invalid": item.invalid || undefined,
    autoFocus: true,
  };
  return multiline ? (
    <Textarea rows={3} {...common} onChange={(e) => item.setValue(e.target.value)} />
  ) : (
    <Input {...common} onChange={(e) => item.setValue(e.target.value)} />
  );
}

export function QuestionnaireError({ children }: { children: ReactNode }) {
  const item = useItem();
  return item.invalid ? <Text size="small" role="alert" className="text-ui-fg-error">{children}</Text> : null;
}

export function QuestionnaireActions({ className, ...props }: ComponentProps<"div">) {
  return <div className={clx("flex items-center justify-end gap-2", className)} {...props} />;
}

export function QuestionnaireNext({ children, ...props }: Omit<ComponentProps<typeof Button>, "type">) {
  return <Button type="submit" size="small" {...props}>{children}</Button>;
}

export function QuestionnaireSkip({ children, ...props }: Omit<ComponentProps<typeof Button>, "type">) {
  return <Button type="button" size="small" variant="transparent" {...props}>{children}</Button>;
}

export function QuestionnaireProgress({ current, total, render }: { current: number; total: number; render?: (p: { current: number; total: number }) => ReactNode }) {
  return <Text size="xsmall" className="text-ui-fg-muted">{render ? render({ current, total }) : `${current}/${total}`}</Text>;
}
```

`packages/ui/src/components/common/questionnaire/index.ts`:
```ts
export * from "./questionnaire";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @repo/ui test questionnaire`
Expected: PASS (7 tests).

If "selects one choice in single mode" fails because the medusa radio item doesn't expose `role="radio"`, run `screen.debug()` inside the test, find the rendered element for `RadioGroup.ChoiceBox`, and query that element's role instead. Don't change the component to fit the test.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/common/questionnaire packages/ui/src/components/common/index.ts
git commit -m "feat(ui): questionnaire component on medusa primitives"
```

---

### Task 7: API stores `agentProfile` and compiles `generalKnowledge`

**Files:**
- Modify: `apps/api/package.json` (dependency `"@repo/agent-blueprint": "workspace:*"`)
- Modify: `apps/api/test/jest.json` and `apps/api/test/jest-e2e.json` (moduleNameMapper)
- Modify: `apps/api/src/modules/chatbot/enums/chatbot.enum.ts`
- Modify: `apps/api/src/modules/chatbot/repository/entities/chatbot.entity.ts`
- Modify: `apps/api/src/modules/chatbot/dtos/request/chatbot.create.request.dto.ts`
- Modify: `apps/api/src/modules/chatbot/dtos/response/chatbot.list.response.dto.ts`
- Modify: `apps/api/src/modules/chatbot/constants/chatbot.update.constant.ts`
- Modify: `apps/api/src/modules/chatbot/services/chatbot.service.ts`
- Modify: `apps/api/src/languages/en/chatbot.json`, `apps/api/src/languages/vi/chatbot.json`
- Create (generated): `apps/api/migrations/<timestamp>_chatbot_agent_profile.ts`
- Test: `apps/api/test/modules/chatbot/services/chatbot.service.profile.spec.ts`

**Interfaces:**
- Consumes: `agentProfileSchema`, `compilePrompt`, `AgentProfile` from `@repo/agent-blueprint`.
- Produces:
  - `ChatbotEntity.agentProfile?: AgentProfile` (jsonb) and `ChatbotEntity.extraInstructions?: string` (text).
  - Create/update DTO fields `agentProfile?: Record<string, unknown>`, `extraInstructions?: string`, and `status?: ENUM_CHATBOT_STATUS`. `status` is create only; it isn't in `CHATBOT_EDITABLE_FIELDS`.
  - `ChatbotService.resolvePromptFields(input: { agentProfile?: unknown; extraInstructions?: string; generalKnowledge?: string }, existing?: { agentProfile?: AgentProfile | null; extraInstructions?: string | null }): { agentProfile?: AgentProfile; extraInstructions?: string; generalKnowledge?: string }`. The result only contains keys that should be written.
  - Detail and list responses now include `agentProfile` and `extraInstructions`.

**Warning, partial updates:** `pickFields` in `chatbot.controller.ts` copies every editable field, so an unsent field becomes `undefined`. Clients must send the full payload on update. The app does this with one payload builder in Task 11.

- [ ] **Step 1: Wire the package into the API**

In `apps/api/package.json` `dependencies`, add `"@repo/agent-blueprint": "workspace:*"`. Then run `pnpm install` from the repo root.

In `apps/api/test/jest.json` and `apps/api/test/jest-e2e.json`, extend `moduleNameMapper` so tests use the TypeScript source and need no build:
```json
    "moduleNameMapper": {
        "^@app/(.+)$": "<rootDir>/src/$1",
        "^@repo/agent-blueprint$": "<rootDir>/../../packages/agent-blueprint/src/index.ts"
    },
```
(Keep any other mappings `jest-e2e.json` already has.)

- [ ] **Step 2: Write the failing test**

`apps/api/test/modules/chatbot/services/chatbot.service.profile.spec.ts`:
```ts
import { BadRequestException } from '@nestjs/common';
import { createProfile } from '@repo/agent-blueprint';
import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';

describe('ChatbotService.resolvePromptFields', () => {
    const service = new ChatbotService({} as any, {} as any, {} as any);
    const profile = { ...createProfile('beauty', 'vi'), businessName: 'Lotus', agentName: 'Linh' };

    it('compiles generalKnowledge from a valid profile and appends extra instructions', () => {
        const out = service.resolvePromptFields({ agentProfile: profile, extraInstructions: 'Closed on Mondays.' });
        expect(out.agentProfile).toEqual(profile);
        expect(out.generalKnowledge).toContain('# Linh · Lotus');
        expect(out.generalKnowledge).toContain('## Extra instructions\nClosed on Mondays.');
        expect(out.generalKnowledge).not.toContain('—');
    });

    it('rejects an invalid profile with a localized bad request', () => {
        expect(() => service.resolvePromptFields({ agentProfile: { ...profile, goals: ['hack'] } }))
            .toThrow(BadRequestException);
    });

    it('keeps a legacy prompt: extra instructions become generalKnowledge when there is no profile', () => {
        const legacy = 'Old hand-written prompt that must survive.';
        const out = service.resolvePromptFields({ extraInstructions: legacy });
        expect(out.generalKnowledge).toBe(legacy);
        expect(out.agentProfile).toBeUndefined();
    });

    it('passes generalKnowledge through untouched for old clients', () => {
        expect(service.resolvePromptFields({ generalKnowledge: 'raw' })).toEqual({ generalKnowledge: 'raw' });
    });

    it('recompiles from the stored profile when only extra instructions change', () => {
        const out = service.resolvePromptFields({ extraInstructions: 'New note.' }, { agentProfile: profile, extraInstructions: 'Old note.' });
        expect(out).toEqual({ extraInstructions: 'New note.', generalKnowledge: expect.stringContaining('## Extra instructions\nNew note.') });
        expect(out.generalKnowledge).toContain('# Linh · Lotus');
    });

    it('leaves prompt fields alone on a partial update of a builder bot', () => {
        expect(service.resolvePromptFields({ generalKnowledge: 'raw edit' }, { agentProfile: profile })).toEqual({});
    });

    it('keeps stored extra instructions when a new profile arrives without them', () => {
        const out = service.resolvePromptFields({ agentProfile: profile }, { agentProfile: profile, extraInstructions: 'Keep me.' });
        expect(out.generalKnowledge).toContain('## Extra instructions\nKeep me.');
    });
});

describe('ChatbotService.create', () => {
    it('invalidates the apps/ai cache after creating', async () => {
        const repo = { create: jest.fn(async (e: any) => ({ ...e, id: 'c1', accounts: { add: jest.fn() } })) };
        const cache = { invalidate: jest.fn() };
        const service = new ChatbotService({ getReference: jest.fn() } as any, repo as any, cache as any);
        await service.create({ name: 'b', type: 'beauty', primaryLanguage: 'vi', modelTextName: 'openai/gpt-5.4', workspace: 'w1' } as any);
        expect(cache.invalidate).toHaveBeenCalledWith('c1');
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter api test -- chatbot.service.profile`
Expected: FAIL with "service.resolvePromptFields is not a function" and "expected invalidate to have been called".

- [ ] **Step 4: Implement the enum, entity, DTO, response and editable fields**

`apps/api/src/modules/chatbot/enums/chatbot.enum.ts`: add these values to `ENUM_CHATBOT_TYPE`, before `OTHER`:
```ts
    COSMETICS = 'cosmetics',
    HOTEL = 'hotel',
    HOME_SERVICES = 'home_services',
    STUDIO_EVENTS = 'studio_events',
    HEALTH_FOODS = 'health_foods',
    PERSONAL_SCHEDULING = 'personal_scheduling',
    PERSONAL_EMAIL = 'personal_email',
    PERSONAL_TASKS = 'personal_tasks',
    PERSONAL_RESEARCH = 'personal_research',
    PERSONAL_CRM = 'personal_crm',
```

`chatbot.entity.ts`: add `import type { AgentProfile } from '@repo/agent-blueprint';`, then add after `generalKnowledge`:
```ts
    // Agent builder answers. When set, generalKnowledge is compiled from it.
    @Property({ type: 'jsonb', nullable: true })
    agentProfile?: AgentProfile;

    @Property({ type: 'text', nullable: true })
    extraInstructions?: string;
```

`chatbot.create.request.dto.ts`: add `IsObject` to the `class-validator` import, import `ENUM_CHATBOT_STATUS` from the enum file, and add after `generalKnowledge`:
```ts
    @IsOptional()
    @IsObject()
    @ApiProperty({
        description: 'Agent builder answers. Compiled into generalKnowledge on save.',
        required: false,
        type: 'object',
        additionalProperties: true,
    })
    agentProfile?: Record<string, unknown>;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    @ApiProperty({
        description: 'Free text appended after the compiled agent instructions',
        required: false,
    })
    extraInstructions?: string;

    @IsOptional()
    @IsEnum(ENUM_CHATBOT_STATUS)
    @ApiProperty({
        description: 'Initial status. The agent builder creates drafts as inactive.',
        enum: ENUM_CHATBOT_STATUS,
        required: false,
    })
    status?: ENUM_CHATBOT_STATUS;
```

`chatbot.list.response.dto.ts`: add these next to `generalKnowledge` (the detail DTO extends or mirrors it; if the detail response DTO is a separate class, add them there too):
```ts
    @ApiProperty({ required: false, type: 'object', additionalProperties: true, nullable: true })
    agentProfile?: Record<string, unknown>;

    @ApiProperty({ required: false, nullable: true })
    extraInstructions?: string;
```

`chatbot.update.constant.ts`: add `'agentProfile',` and `'extraInstructions',` after `'generalKnowledge',`.

`apps/api/src/languages/en/chatbot.json`: under the existing `"error"` object add `"invalidAgentProfile": "The agent builder answers are not valid."`.
`apps/api/src/languages/vi/chatbot.json`: under the existing `"error"` object add `"invalidAgentProfile": "Câu trả lời của trình tạo agent không hợp lệ."`.

- [ ] **Step 5: Implement the service**

In `chatbot.service.ts`:
- Import `BadRequestException` from `@nestjs/common` (next to `NotFoundException`).
- Import `import { agentProfileSchema, compilePrompt, type AgentProfile } from '@repo/agent-blueprint';`
- Add this method above `buildCreateEntity`:
```ts
    /**
     * Decides what to write to agentProfile / extraInstructions /
     * generalKnowledge. Builder bots always get a compiled prompt; a partial
     * update never wipes their profile. Bots without a profile keep their
     * prompt: Extra instructions carries the old text (forms prefill it), and
     * old clients may still send generalKnowledge directly.
     */
    resolvePromptFields(
        input: { agentProfile?: unknown; extraInstructions?: string; generalKnowledge?: string },
        existing?: { agentProfile?: AgentProfile | null; extraInstructions?: string | null }
    ): { agentProfile?: AgentProfile; extraInstructions?: string; generalKnowledge?: string } {
        if (input.agentProfile !== undefined && input.agentProfile !== null) {
            const parsed = agentProfileSchema.safeParse(input.agentProfile);
            if (!parsed.success) {
                throw new BadRequestException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.REQUEST_VALIDATION,
                    message: 'chatbot.error.invalidAgentProfile',
                });
            }
            const extra = input.extraInstructions ?? existing?.extraInstructions ?? undefined;
            return {
                agentProfile: parsed.data,
                ...(extra !== undefined ? { extraInstructions: extra } : {}),
                generalKnowledge: compilePrompt(parsed.data, { extraInstructions: extra }),
            };
        }
        if (existing?.agentProfile) {
            if (input.extraInstructions === undefined) return {};
            return {
                extraInstructions: input.extraInstructions,
                generalKnowledge: compilePrompt(existing.agentProfile, {
                    extraInstructions: input.extraInstructions,
                }),
            };
        }
        if (input.extraInstructions !== undefined) {
            return {
                extraInstructions: input.extraInstructions,
                generalKnowledge: input.extraInstructions,
            };
        }
        return input.generalKnowledge !== undefined ? { generalKnowledge: input.generalKnowledge } : {};
    }
```
Check that `ENUM_APP_STATUS_CODE_ERROR.REQUEST_VALIDATION` exists (`grep -rn "REQUEST_VALIDATION" apps/api/src/app/enums`). If it doesn't, use the closest validation code that `grep -n "=" apps/api/src/app/enums/app.status-code.enum.ts` lists.

- In `buildCreateEntity`, after the `modelProvider` line, return the resolved prompt fields merged in:
```ts
        const promptFields = this.resolvePromptFields(fieldsWithoutAccounts);
        return { ...fieldsWithoutAccounts, ...promptFields, modelProvider };
```
Update its declared return type so `agentProfile` is typed: replace `Omit<ChatbotCreateRequestDto, 'accounts'>` with `Omit<ChatbotCreateRequestDto, 'accounts' | 'agentProfile'> & { agentProfile?: AgentProfile }`.

- In `create`, after the accounts loop and before `return chatbot;`:
```ts
        // apps/ai may already hold a stale miss for this id; drop it.
        await this.chatbotCacheService.invalidate(chatbot.id);
```

- In `update`, before `wrap(repository).assign(...)`, take the three prompt keys out of the picked fields (so an `undefined` from `pickFields` can never overwrite them) and let `resolvePromptFields` decide:
```ts
        const {
            agentProfile: _agentProfile,
            extraInstructions: _extraInstructions,
            generalKnowledge: _generalKnowledge,
            ...otherFields
        } = assignableFields;
        const promptFields = this.resolvePromptFields(assignableFields, {
            agentProfile: repository.agentProfile,
            extraInstructions: repository.extraInstructions,
        });
```
and change the assign call to `{ ...otherFields, ...promptFields, ...modelProviderUpdate }`.

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter api test -- chatbot.service`
Expected: PASS for both `chatbot.service.profile.spec.ts` and the existing `chatbot.service.spec.ts`.

- [ ] **Step 7: Generate the migration**

With Postgres running (`docker start ecbot-database-1`), run from the repo root:
`pnpm db:migrate:create`
Expected: a new file in `apps/api/migrations/` whose `up()` contains:
```sql
alter table "chatbots" add column "agent_profile" jsonb null, add column "extra_instructions" text null;
```
and whose `down()` drops both columns. The snapshot file (`.snapshot-neondb.json` or its equivalent) also changes. If the generated file contains anything else, stop and investigate: it means the snapshot was already out of date. Rename the file suffix to `_chatbot_agent_profile.ts` if the CLI used a generic name, and rename the class to match.

Run: `pnpm db:migrate:up`
Expected: "Successfully migrated up to the latest version".

- [ ] **Step 8: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): store agent builder profile and compile it into the chatbot prompt"
```

---

### Task 8: API `POST /:workspace/agent-builder/suggest` (Jev + Redis)

**Files:**
- Create: `apps/api/src/configs/agent-builder.config.ts`
- Modify: `apps/api/src/configs/index.ts`
- Modify: `apps/api/.env.example` (add `TYPESAFE_API_KEY=`)
- Create: `apps/api/src/modules/agent-builder/agent-builder.module.ts`
- Create: `apps/api/src/modules/agent-builder/services/typesafe-api.service.ts`
- Create: `apps/api/src/modules/agent-builder/services/agent-builder.service.ts`
- Create: `apps/api/src/modules/agent-builder/dtos/request/agent-builder.suggest.request.dto.ts`
- Create: `apps/api/src/modules/agent-builder/dtos/response/agent-builder.suggest.response.dto.ts`
- Create: `apps/api/src/modules/agent-builder/docs/agent-builder.workspace.doc.ts`
- Create: `apps/api/src/modules/agent-builder/controllers/agent-builder.workspace.controller.ts`
- Modify: `apps/api/src/router/routes/routes.workspace.module.ts`
- Create: `apps/api/src/languages/en/agentBuilder.json`, `apps/api/src/languages/vi/agentBuilder.json`
- Test: `apps/api/test/modules/agent-builder/services/agent-builder.service.spec.ts`
- Test: `apps/api/test/modules/agent-builder/services/typesafe-api.service.spec.ts`

**Interfaces:**
- Consumes: `buildSuggestQuestions`, `readSuggestAnswers`, `EMPTY_SUGGESTION`, `AgentSuggestion`, `SystemOneQuestion`, `SystemOneAnswer` from `@repo/agent-blueprint`.
- Produces:
  - `TypeSafeApiService.systemOne(state: string, questions: Record<string, SystemOneQuestion>): Promise<Record<string, SystemOneAnswer>>`
  - `AgentBuilderService.suggest(description: string): Promise<AgentSuggestion>`. It never throws.
  - `AgentBuilderService.cacheKey(description: string): string`
  - HTTP: `POST /api/v1/:workspace/agent-builder/suggest` with body `{ description: string }` (1 to 1000 chars), returning `{ data: AgentSuggestion }`. The generated client function will be `agentBuilderWorkspaceControllerSuggestV1`.

- [ ] **Step 1: Write the failing tests**

`apps/api/test/modules/agent-builder/services/typesafe-api.service.spec.ts`:
```ts
import { TypeSafeApiService } from '../../../../src/modules/agent-builder/services/typesafe-api.service';

const config = (values: Record<string, unknown>) => ({ get: (k: string) => values[k] }) as any;
const base = {
    'agentBuilder.typesafe.apiKey': 'k',
    'agentBuilder.typesafe.baseUrl': 'https://api.typesafe.ai',
    'agentBuilder.typesafe.model': 'jev-latest',
    'agentBuilder.typesafe.timeoutMs': 8000,
};

describe('TypeSafeApiService', () => {
    afterEach(() => jest.restoreAllMocks());

    it('throws when the API key is missing', async () => {
        const s = new TypeSafeApiService(config({ ...base, 'agentBuilder.typesafe.apiKey': undefined }));
        await expect(s.systemOne('x', {})).rejects.toThrow('TYPESAFE_API_KEY');
    });

    it('posts model, state and questions with a bearer token and returns answers', async () => {
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ answers: { a: { type: 'noul', noul: 0.9 } } }), { status: 200 })
        );
        const s = new TypeSafeApiService(config(base));
        const out = await s.systemOne('hello', { a: { type: 'noul', instructions: 'q' } });
        expect(out).toEqual({ a: { type: 'noul', noul: 0.9 } });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.typesafe.ai/v1/systemone');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k');
        expect(JSON.parse(init.body as string)).toEqual({ model: 'jev-latest', state: 'hello', questions: { a: { type: 'noul', instructions: 'q' } } });
    });

    it('throws on a non-2xx response', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 529 }));
        await expect(new TypeSafeApiService(config(base)).systemOne('x', {})).rejects.toThrow('529');
    });
});
```

`apps/api/test/modules/agent-builder/services/agent-builder.service.spec.ts`:
```ts
import { EMPTY_SUGGESTION } from '@repo/agent-blueprint';
import { AgentBuilderService } from '../../../../src/modules/agent-builder/services/agent-builder.service';

const config = { get: (k: string) => (k === 'agentBuilder.suggestTtlMs' ? 86_400_000 : undefined) } as any;

function setup(overrides: { cached?: unknown; answers?: unknown; fail?: boolean } = {}) {
    const typesafe = {
        systemOne: jest.fn(async () => {
            if (overrides.fail) throw new Error('down');
            return overrides.answers ?? { business_type: { type: 'choice', choice: 'beauty', confidence: 0.95 } };
        }),
    };
    const cache = { get: jest.fn(async () => overrides.cached), set: jest.fn() };
    return { typesafe, cache, service: new AgentBuilderService(typesafe as any, cache as any, config) };
}

describe('AgentBuilderService.suggest', () => {
    it('returns a cached suggestion without calling TypeSafe', async () => {
        const cached = { ...EMPTY_SUGGESTION, businessType: { value: 'hotel', confidence: 0.9 } };
        const { service, typesafe } = setup({ cached });
        await expect(service.suggest('homestay in Hoi An')).resolves.toEqual(cached);
        expect(typesafe.systemOne).not.toHaveBeenCalled();
    });

    it('calls TypeSafe, maps the answers and caches them for 24h', async () => {
        const { service, cache, typesafe } = setup();
        const out = await service.suggest('  Nail spa in Da Nang  ');
        expect(typesafe.systemOne).toHaveBeenCalledWith('Nail spa in Da Nang', expect.objectContaining({ business_type: expect.any(Object) }));
        expect(out.businessType).toEqual({ value: 'beauty', confidence: 0.95 });
        expect(cache.set).toHaveBeenCalledWith(AgentBuilderService.cacheKey('Nail spa in Da Nang'), out, 86_400_000);
    });

    it('returns the empty suggestion and caches nothing when TypeSafe fails', async () => {
        const { service, cache } = setup({ fail: true });
        await expect(service.suggest('x')).resolves.toEqual(EMPTY_SUGGESTION);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('ignores malformed answers', async () => {
        const { service } = setup({ answers: { business_type: { type: 'choice', choice: 42 }, goal__take_orders: { type: 'noul', noul: 'high' } } });
        const out = await service.suggest('x');
        expect(out.businessType).toBeNull();
        expect(out.goals).toEqual({});
    });

    it('normalises case and spacing in the cache key', () => {
        expect(AgentBuilderService.cacheKey(' Nail  Spa ')).toBe(AgentBuilderService.cacheKey('nail spa'));
        expect(AgentBuilderService.cacheKey('x')).toMatch(/^agent-builder:suggest:v1:[a-f0-9]{64}$/);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter api test -- agent-builder`
Expected: FAIL with "Cannot find module '../../../../src/modules/agent-builder/services/…'".

- [ ] **Step 3: Implement config and services**

`apps/api/src/configs/agent-builder.config.ts`:
```ts
import { registerAs } from '@nestjs/config';

export default registerAs(
    'agentBuilder',
    (): Record<string, any> => ({
        typesafe: {
            apiKey: process.env.TYPESAFE_API_KEY,
            baseUrl: process.env.TYPESAFE_BASE_URL || 'https://api.typesafe.ai',
            model: 'jev-latest',
            timeoutMs: 8000,
        },
        suggestTtlMs: 86_400_000,
    })
);
```
In `apps/api/src/configs/index.ts`, add `import AgentBuilderConfig from 'src/configs/agent-builder.config';` and add `AgentBuilderConfig,` to the exported array.

`apps/api/src/modules/agent-builder/services/typesafe-api.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SystemOneAnswer, SystemOneQuestion } from '@repo/agent-blueprint';

// TypeSafe System One over plain HTTP (https://docs.typesafe.ai/api).
@Injectable()
export class TypeSafeApiService {
    constructor(private readonly config: ConfigService) {}

    async systemOne(
        state: string,
        questions: Record<string, SystemOneQuestion>
    ): Promise<Record<string, SystemOneAnswer>> {
        const apiKey = this.config.get<string>('agentBuilder.typesafe.apiKey');
        if (!apiKey) throw new Error('TYPESAFE_API_KEY is not set');

        const res = await fetch(
            `${this.config.get<string>('agentBuilder.typesafe.baseUrl')}/v1/systemone`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.config.get<string>('agentBuilder.typesafe.model'),
                    state,
                    questions,
                }),
                signal: AbortSignal.timeout(
                    this.config.get<number>('agentBuilder.typesafe.timeoutMs') ?? 8000
                ),
            }
        );
        if (!res.ok) throw new Error(`TypeSafe responded ${res.status}`);
        const body = (await res.json()) as { answers?: Record<string, SystemOneAnswer> };
        return body.answers ?? {};
    }
}
```

`apps/api/src/modules/agent-builder/services/agent-builder.service.ts`:
```ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EMPTY_SUGGESTION,
    buildSuggestQuestions,
    readSuggestAnswers,
    type AgentSuggestion,
} from '@repo/agent-blueprint';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { TypeSafeApiService } from './typesafe-api.service';

@Injectable()
export class AgentBuilderService {
    private readonly logger = new Logger(AgentBuilderService.name);

    constructor(
        private readonly typesafe: TypeSafeApiService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly config: ConfigService
    ) {}

    static cacheKey(description: string): string {
        const normalised = description.trim().toLowerCase().replace(/\s+/g, ' ');
        const hash = createHash('sha256').update(normalised).digest('hex');
        return `agent-builder:suggest:v1:${hash}`;
    }

    // Never throws: the builder works without suggestions.
    async suggest(description: string): Promise<AgentSuggestion> {
        const state = description.trim();
        const key = AgentBuilderService.cacheKey(state);
        try {
            const cached = await this.cache.get<AgentSuggestion>(key);
            if (cached) return cached;

            const answers = await this.typesafe.systemOne(state, buildSuggestQuestions());
            const suggestion = readSuggestAnswers(answers);
            await this.cache.set(key, suggestion, this.config.get<number>('agentBuilder.suggestTtlMs'));
            return suggestion;
        } catch (error) {
            this.logger.warn(`agent builder suggest failed: ${(error as Error).message}`);
            return EMPTY_SUGGESTION;
        }
    }
}
```

- [ ] **Step 4: Run the service tests**

Run: `pnpm --filter api test -- agent-builder`
Expected: PASS (8 tests).

- [ ] **Step 5: Add DTOs, doc, controller, module and route registration**

`dtos/request/agent-builder.suggest.request.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AgentBuilderSuggestRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    @ApiProperty({
        description: 'One or two sentences about the business and what the agent should do',
        example: 'I run a nail spa in Da Nang. Customers ask prices and want to book.',
    })
    description: string;
}
```

`dtos/response/agent-builder.suggest.response.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';

export class AgentBuilderScoredDto {
    @ApiProperty()
    value: string;

    @ApiProperty({ minimum: 0, maximum: 1 })
    confidence: number;
}

export class AgentBuilderSuggestResponseDto {
    @ApiProperty({ type: AgentBuilderScoredDto, nullable: true })
    businessType: AgentBuilderScoredDto | null;

    @ApiProperty({ type: AgentBuilderScoredDto, nullable: true })
    personality: AgentBuilderScoredDto | null;

    @ApiProperty({ type: AgentBuilderScoredDto, nullable: true })
    formality: AgentBuilderScoredDto | null;

    @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
    goals: Record<string, number>;

    @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
    rules: Record<string, number>;
}
```

`docs/agent-builder.workspace.doc.ts`:
```ts
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { AgentBuilderSuggestRequestDto } from '../dtos/request/agent-builder.suggest.request.dto';
import { AgentBuilderSuggestResponseDto } from '../dtos/response/agent-builder.suggest.response.dto';

export function AgentBuilderWorkspaceSuggestDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'suggest agent builder answers from a short description' }),
        DocRequest({
            params: WorkspaceDocParamsId,
            dto: AgentBuilderSuggestRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('agentBuilder.suggest.success', { dto: AgentBuilderSuggestResponseDto })
    );
}
```

`controllers/agent-builder.workspace.controller.ts`:
```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_POLICY_ACTION, ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { WorkspacePolicyAbilityProtected } from 'src/modules/workspace/decorators/workspace.decorator';
import { AgentBuilderWorkspaceSuggestDoc } from '../docs/agent-builder.workspace.doc';
import { AgentBuilderSuggestRequestDto } from '../dtos/request/agent-builder.suggest.request.dto';
import { AgentBuilderSuggestResponseDto } from '../dtos/response/agent-builder.suggest.response.dto';
import { AgentBuilderService } from '../services/agent-builder.service';

@ApiTags('modules.workspace.agentBuilder')
@Controller({ version: '1', path: '/:workspace/agent-builder' })
export class AgentBuilderWorkspaceController {
    constructor(private readonly agentBuilderService: AgentBuilderService) {}

    @AgentBuilderWorkspaceSuggestDoc()
    @Response('agentBuilder.suggest.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/suggest')
    async suggest(
        @Body() { description }: AgentBuilderSuggestRequestDto
    ): Promise<IResponse<AgentBuilderSuggestResponseDto>> {
        return { data: await this.agentBuilderService.suggest(description) };
    }
}
```
Before saving, open `apps/api/src/modules/skill/controllers/skill.workspace.controller.ts` and check what a single-item handler returns (search for `return {` under a `@Response(` method). If the project returns `{ data }`, keep the code above. If it returns the DTO directly, return `await this.agentBuilderService.suggest(description)` and change the return type to match the pattern used there.

`agent-builder.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AgentBuilderService } from './services/agent-builder.service';
import { TypeSafeApiService } from './services/typesafe-api.service';

@Module({
    providers: [TypeSafeApiService, AgentBuilderService],
    exports: [AgentBuilderService],
    controllers: [], // per project convention, controllers register in routes.{access}.module.ts
})
export class AgentBuilderModule {}
```

`routes.workspace.module.ts`: import `AgentBuilderWorkspaceController` and `AgentBuilderModule` (using the same `@app/modules/...` style as the skill imports), add the controller to `controllers` and the module to `imports`.

`apps/api/src/languages/en/agentBuilder.json`:
```json
{
    "suggest": {
        "success": "Suggestions are ready"
    }
}
```
`apps/api/src/languages/vi/agentBuilder.json`:
```json
{
    "suggest": {
        "success": "Đã có gợi ý"
    }
}
```
`apps/api/.env.example`: add the line `TYPESAFE_API_KEY=`.

- [ ] **Step 6: Smoke-test the endpoint**

Start the API (`pnpm turbo run dev --filter=api`). Then, with a valid session cookie or token from the app, run:
```bash
curl -s -X POST "http://localhost:8080/api/v1/<workspace-slug>/agent-builder/suggest" \
  -H "Content-Type: application/json" -H "x-api-key: <VITE_API_KEY value>" \
  -H "Authorization: Bearer <access token>" \
  -d '{"description":"I run a nail spa in Da Nang. Customers ask prices and want to book."}'
```
Expected:
- **Key set:** `data.businessType.value` is `"beauty"`.
- **No `TYPESAFE_API_KEY`:** HTTP 200 with `data.businessType` equal to `null` (the fallback), and a warning in the API log.

- [ ] **Step 7: Regenerate the client**

With the API dev server running, run `pnpm generate:client`.
Expected: `packages/client/src` now exports `agentBuilderWorkspaceControllerSuggestV1`, and `ChatbotCreateRequestDto` has `agentProfile`, `extraInstructions` and `status`.
Check: `grep -rn "agentBuilderWorkspaceControllerSuggestV1\|extraInstructions" packages/client/src | head`

- [ ] **Step 8: Commit**

```bash
git add apps/api packages/client
git commit -m "feat(api): agent builder suggest endpoint backed by Jev with Redis cache"
```

---

### Amendment (2026-09-24): the decision model runs in apps/ai on OpenRouter

The owner decided the suggestion call must not go to TypeSafe's API. Instead, `apps/ai` answers the same typed questions with an OpenRouter model chosen by an environment variable (`DECISION_MODEL`, defaulting to `google/gemini-2.5-flash`), through the existing LangChain `build_chat_model(...).with_structured_output(...)` pattern that the customer classifier uses. Jev is not on OpenRouter; because the new endpoint keeps System One's request and answer shape, a Jev provider can be added later behind the same variable without touching apps/api or `@repo/agent-blueprint`.

What changes:
- **New Task 8a** (below) adds `POST /api/decision/system-one` to apps/ai.
- **Task 8** keeps everything except the TypeSafe client: `services/typesafe-api.service.ts` and its spec are replaced by `services/ai-decision.service.ts`, which posts `{ state, questions }` to `${ai.backend.url}/api/decision/system-one` exactly like `customer-tag-classifier-task.service.ts` calls apps/ai (`HttpService`, `Authorization: Bearer ${process.env.API_INTERNAL_TOKEN}`), and reads `data.answers`. `agent-builder.config.ts` drops the `typesafe` block and keeps `suggestTtlMs: 86_400_000` plus `decisionTimeoutMs: 15000`. `TYPESAFE_API_KEY` is not added to `.env.example`. `AgentBuilderModule` imports `HttpModule`.
- Global constraint "model `jev-latest` / `TYPESAFE_API_KEY`" is replaced by: decision model from `DECISION_MODEL` in apps/ai; no provider key in apps/api.

`apps/api/src/modules/agent-builder/services/ai-decision.service.ts`:
```ts
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SystemOneAnswer, SystemOneQuestion } from '@repo/agent-blueprint';
import { firstValueFrom } from 'rxjs';

// apps/ai answers System One-shaped questions with the model in DECISION_MODEL.
@Injectable()
export class AiDecisionService {
    private readonly baseUrl: string;
    private readonly internalToken: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService
    ) {
        this.baseUrl = this.config.get<string>('ai.backend.url') ?? 'http://localhost:8000';
        this.internalToken = process.env.API_INTERNAL_TOKEN ?? '';
    }

    async systemOne(
        state: string,
        questions: Record<string, SystemOneQuestion>
    ): Promise<Record<string, SystemOneAnswer>> {
        const resp = await firstValueFrom(
            this.http.post(
                `${this.baseUrl}/api/decision/system-one`,
                { state, questions },
                {
                    timeout: this.config.get<number>('agentBuilder.decisionTimeoutMs') ?? 15000,
                    headers: {
                        Authorization: `Bearer ${this.internalToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
        );
        const payload = resp.data as { data?: { answers?: Record<string, SystemOneAnswer> } };
        return payload?.data?.answers ?? {};
    }
}
```
`apps/api/test/modules/agent-builder/services/ai-decision.service.spec.ts` (replaces the TypeSafe spec):
```ts
import { of } from 'rxjs';
import { AiDecisionService } from '../../../../src/modules/agent-builder/services/ai-decision.service';

const config = { get: (k: string) => ({ 'ai.backend.url': 'http://ai:8000', 'agentBuilder.decisionTimeoutMs': 15000 } as Record<string, unknown>)[k] } as any;

describe('AiDecisionService', () => {
    it('posts state and questions to apps/ai and returns the answers', async () => {
        const post = jest.fn(() => of({ data: { data: { answers: { a: { type: 'noul', noul: 0.9 } } } } }));
        const s = new AiDecisionService({ post } as any, config);
        const out = await s.systemOne('hello', { a: { type: 'noul', instructions: 'q' } });
        expect(out).toEqual({ a: { type: 'noul', noul: 0.9 } });
        const [url, body, opts] = post.mock.calls[0] as unknown as [string, unknown, { timeout: number; headers: Record<string, string> }];
        expect(url).toBe('http://ai:8000/api/decision/system-one');
        expect(body).toEqual({ state: 'hello', questions: { a: { type: 'noul', instructions: 'q' } } });
        expect(opts.timeout).toBe(15000);
        expect(opts.headers.Authorization).toMatch(/^Bearer /);
    });

    it('returns no answers when apps/ai sends none', async () => {
        const s = new AiDecisionService({ post: () => of({ data: {} }) } as any, config);
        await expect(s.systemOne('x', {})).resolves.toEqual({});
    });
});
```
`AgentBuilderService` takes `AiDecisionService` where it took `TypeSafeApiService`; its spec's fake keeps the same `systemOne` method, so only the import/type changes.

---

### Task 8a: apps/ai decision endpoint (`POST /api/decision/system-one`)

**Files:**
- Modify: `apps/ai/src/eccho_ai/core/variables.py` (add `DECISION_MODEL: str = "google/gemini-2.5-flash"` next to `CLASSIFIER_MODEL`)
- Modify: `apps/ai/.env.example` (add `DECISION_MODEL=google/gemini-2.5-flash` next to `CLASSIFIER_MODEL`)
- Create: `apps/ai/src/eccho_ai/modules/decision/__init__.py` (empty)
- Create: `apps/ai/src/eccho_ai/modules/decision/models.py`
- Create: `apps/ai/src/eccho_ai/modules/decision/routers.py`
- Modify: `apps/ai/src/eccho_ai/main.py` (include the router with `prefix="/api"`, like `customer_router`)
- Test: `apps/ai/tests/test_decision_endpoint.py`

**Interfaces:**
- Consumes: the question shape produced by `buildSuggestQuestions()` in `@repo/agent-blueprint`: `{ type: "choice", instructions, criteria: {id: description} } | { type: "noul", instructions }`.
- Produces: `POST /api/decision/system-one` with body `{ state: string, questions: Record<string, Question> }`, returning `AppResponse` with `data.answers`, where each answer is `{ type: "choice", choice, confidence }` or `{ type: "noul", noul }`. On any model failure it returns `data.answers == {}` with HTTP 200.

- [ ] **Step 1: Write the failing test**

`apps/ai/tests/test_decision_endpoint.py` (mirrors `tests/test_customer_classify_endpoint.py`: same `async_client` fixture, same monkeypatch of `build_chat_model` inside the router module):
```python
from __future__ import annotations

from typing import Any

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.decision import routers as decision_router_module


class _FakeStructured:
    def __init__(self, *, returns: Any = None, raises: Exception | None = None):
        self._returns = returns
        self._raises = raises
        self.calls: list[Any] = []

    async def ainvoke(self, messages: Any) -> Any:
        self.calls.append(messages)
        if self._raises is not None:
            raise self._raises
        return self._returns


class _FakeLLM:
    def __init__(self, structured: _FakeStructured) -> None:
        self._structured = structured
        self.schema: type | None = None

    def with_structured_output(self, schema: type) -> _FakeStructured:
        self.schema = schema
        return self._structured


@pytest.fixture
def patch_llm(monkeypatch):
    seen: dict[str, Any] = {}

    def _apply(structured: _FakeStructured) -> dict[str, Any]:
        fake = _FakeLLM(structured)

        def _build(*_a, **kw):
            seen["kwargs"] = kw
            return fake

        monkeypatch.setattr(decision_router_module, "build_chat_model", _build)
        seen["llm"] = fake
        return seen

    return _apply


BODY = {
    "state": "Nail spa in Da Nang. Customers ask prices and want to book.",
    "questions": {
        "business_type": {
            "type": "choice",
            "instructions": "Which kind of business is it?",
            "criteria": {"beauty": "A beauty salon or spa", "restaurant": "A restaurant or café"},
        },
        "goal__book_appointments": {"type": "noul", "instructions": "Should it book appointments?"},
    },
}


async def test_answers_in_system_one_shape_with_the_configured_model(async_client, patch_llm):
    seen = patch_llm(_FakeStructured(returns={
        "business_type": {"choice": "beauty", "confidence": 0.93},
        "goal__book_appointments": 0.88,
    }))
    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
        "goal__book_appointments": {"type": "noul", "noul": 0.88},
    }
    assert seen["kwargs"]["model_text_name"] == AppVars.DECISION_MODEL


async def test_output_schema_limits_choices_and_ranges(async_client, patch_llm):
    seen = patch_llm(_FakeStructured(returns={}))
    await async_client.post("/api/decision/system-one", json=BODY)
    schema = seen["llm"].schema
    ok = schema.model_validate({"business_type": {"choice": "beauty", "confidence": 0.5}, "goal__book_appointments": 0.2})
    assert ok is not None
    with pytest.raises(Exception):
        schema.model_validate({"business_type": {"choice": "casino", "confidence": 0.5}, "goal__book_appointments": 0.2})
    with pytest.raises(Exception):
        schema.model_validate({"business_type": {"choice": "beauty", "confidence": 1.5}, "goal__book_appointments": 0.2})


async def test_model_failure_returns_no_answers(async_client, patch_llm):
    patch_llm(_FakeStructured(raises=RuntimeError("provider down")))
    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}


async def test_no_questions_skips_the_model(async_client, patch_llm):
    seen = patch_llm(_FakeStructured(returns={}))
    resp = await async_client.post("/api/decision/system-one", json={"state": "x", "questions": {}})
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
    assert "kwargs" not in seen


async def test_rejects_a_choice_question_without_options(async_client):
    body = {"state": "x", "questions": {"q": {"type": "choice", "instructions": "?", "criteria": {"only": "one"}}}}
    resp = await async_client.post("/api/decision/system-one", json=body)
    assert resp.status_code == 422
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/ai && uv run pytest tests/test_decision_endpoint.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'eccho_ai.modules.decision'`.

- [ ] **Step 3: Implement**

`apps/ai/src/eccho_ai/modules/decision/models.py`:
```python
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class DecisionQuestion(BaseModel):
    type: Literal["choice", "noul"]
    instructions: str = Field(min_length=1, max_length=2000)
    criteria: dict[str, str] | None = None

    @model_validator(mode="after")
    def _choice_needs_options(self) -> "DecisionQuestion":
        if self.type == "choice" and len(self.criteria or {}) < 2:
            raise ValueError("a choice question needs at least two criteria")
        return self


class DecisionRequest(BaseModel):
    state: str = Field(min_length=1, max_length=4000)
    questions: dict[str, DecisionQuestion] = Field(max_length=64)


class DecisionResponse(BaseModel):
    answers: dict[str, dict[str, Any]] = Field(default_factory=dict)
```

`apps/ai/src/eccho_ai/modules/decision/routers.py`:
```python
"""System One-shaped decisions answered by an OpenRouter model.

apps/api sends typed questions (choice / noul, built by @repo/agent-blueprint)
and reads answers in the shape TypeSafe's System One API uses, so which model
decides is configuration (DECISION_MODEL), not code.
"""
import logging
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, create_model

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.models.app_models import AppResponse
from eccho_ai.modules.decision.models import DecisionQuestion, DecisionRequest, DecisionResponse

logger = logging.getLogger("uvicorn.info")
router = APIRouter(prefix="/decision", tags=["Decision"])

SYSTEM_PROMPT = """\
You answer typed questions about a piece of state, like a calibrated classifier.
For a "choice" question, pick exactly one option id from its options and give
your confidence from 0 to 1 that it is the right option.
For a "noul" question, give the probability from 0 to 1 that the answer is yes.
Judge only from the state. Do not explain.
"""


def _output_model(questions: dict[str, DecisionQuestion]) -> type[BaseModel]:
    fields: dict[str, Any] = {}
    for index, (qid, q) in enumerate(questions.items()):
        if q.type == "choice":
            options = tuple((q.criteria or {}).keys())
            answer = create_model(
                f"ChoiceAnswer{index}",
                choice=(Literal[options], ...),  # type: ignore[valid-type]
                confidence=(float, Field(ge=0, le=1)),
            )
            fields[qid] = (answer, ...)
        else:
            fields[qid] = (float, Field(ge=0, le=1))
    return create_model("DecisionAnswers", **fields)


def _format_questions(questions: dict[str, DecisionQuestion]) -> str:
    lines: list[str] = []
    for qid, q in questions.items():
        if q.type == "choice":
            options = "\n".join(f"    - {key}: {text}" for key, text in (q.criteria or {}).items())
            lines.append(f"- {qid} (choice): {q.instructions}\n  options:\n{options}")
        else:
            lines.append(f"- {qid} (noul, probability of yes): {q.instructions}")
    return "\n".join(lines)


def _as_dict(value: Any) -> dict[str, Any]:
    return value.model_dump() if isinstance(value, BaseModel) else dict(value)


@router.post("/system-one", response_model=AppResponse[DecisionResponse])
async def system_one(req: DecisionRequest) -> AppResponse[DecisionResponse]:
    if not req.questions:
        return AppResponse(data=DecisionResponse())

    llm = build_chat_model(model_text_name=AppVars.DECISION_MODEL, temperature=0.0)
    structured = llm.with_structured_output(_output_model(req.questions))
    try:
        result = _as_dict(
            await structured.ainvoke(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"State:\n{req.state}\n\nQuestions:\n{_format_questions(req.questions)}"},
                ]
            )
        )
    except Exception as exc:  # noqa: BLE001 — the builder must work without suggestions
        logger.warning("decision.system_one failed err=%s", exc)
        return AppResponse(data=DecisionResponse())

    answers: dict[str, dict[str, Any]] = {}
    for qid, q in req.questions.items():
        value = result.get(qid)
        if value is None:
            continue
        if q.type == "choice":
            v = _as_dict(value)
            answers[qid] = {"type": "choice", "choice": v.get("choice"), "confidence": v.get("confidence")}
        else:
            answers[qid] = {"type": "noul", "noul": value}
    return AppResponse(data=DecisionResponse(answers=answers))
```

In `main.py`, import `from eccho_ai.modules.decision.routers import router as decision_router` next to the customer router import and add `app.include_router(decision_router, prefix="/api")` next to `customer_router`. In `variables.py` add `DECISION_MODEL: str = "google/gemini-2.5-flash"` under `CLASSIFIER_MODEL` with the comment `# OpenRouter model that answers agent-builder decisions (System One-shaped).`

- [ ] **Step 4: Run the tests**

Run: `cd apps/ai && uv run pytest tests/test_decision_endpoint.py -q && uv run pytest -q`
Expected: the 5 new tests PASS and the existing suite still passes.

- [ ] **Step 5: Commit**

```bash
git add apps/ai
git commit -m "feat(ai): system-one shaped decision endpoint on the configured model"
```

---

### Task 9: Builder translations (en, vi) with a completeness test

**Files:**
- Modify: `apps/app/package.json` (dependency `"@repo/agent-blueprint": "workspace:*"`)
- Modify: `apps/app/src/i18n/translations/en.json`
- Modify: `apps/app/src/i18n/translations/vi.json`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/ui-keys.ts`
- Test: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/i18n-keys.test.ts`

**Interfaces:**
- Consumes: `allTranslationKeys()` from `@repo/agent-blueprint`.
- Produces:
  - `BUILDER_UI_KEYS: string[]`, the `agentBuilder.ui.*` keys the components use.
  - The translation key `actions.skip`.
  - A top-level `agentBuilder` block in both translation files.

- [ ] **Step 1: Add the dependency**

In `apps/app/package.json` `dependencies`, add `"@repo/agent-blueprint": "workspace:*"`, then run `pnpm install` from the repo root.

- [ ] **Step 2: Write the failing test**

`apps/app/src/routes/chatbot/chatbot-create/agent-builder/ui-keys.ts`:
```ts
export const BUILDER_UI_KEYS = [
  "title", "startMessage", "startPlaceholder", "templates", "suggesting", "suggestFailed",
  "suggested", "auto", "check", "required", "skipped", "yes", "no", "editAnswer",
  "draftCreated", "saveFailed", "done", "finish", "finished", "tryAgent", "chatTab",
  "promptTab", "testLocked", "progress", "extraInstructions", "extraInstructionsHint",
  "editWithBuilder",
].map((k) => `agentBuilder.ui.${k}`);
```

`apps/app/src/routes/chatbot/chatbot-create/agent-builder/i18n-keys.test.ts`:
```ts
import en from "@/i18n/translations/en.json";
import vi from "@/i18n/translations/vi.json";
import { allTranslationKeys } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import { BUILDER_UI_KEYS } from "./ui-keys";

const lookup = (dict: unknown, key: string) =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict);

const KEYS = [...allTranslationKeys(), ...BUILDER_UI_KEYS, "actions.skip", "actions.next", "actions.close"];

describe("agent builder translations", () => {
  it.each([["en", en], ["vi", vi]] as const)("%s has every key the builder uses", (_lang, dict) => {
    expect(KEYS.filter((k) => typeof lookup(dict, k) !== "string")).toEqual([]);
  });

  it("never uses an em dash", () => {
    expect(JSON.stringify((en as Record<string, unknown>).agentBuilder)).not.toContain("—");
    expect(JSON.stringify((vi as Record<string, unknown>).agentBuilder)).not.toContain("—");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter app test i18n-keys`
Expected: FAIL. The "en has every key" test lists every missing `agentBuilder.*` key and `actions.skip`.

- [ ] **Step 4: Add the translations**

In `en.json`, add `"skip": "Skip"` inside the existing `"actions"` object. In `vi.json`, add `"skip": "Bỏ qua"` inside `"actions"`.

Add this top-level block to `en.json` (anywhere at the top level, e.g. after `"chatbot"`):
```json
"agentBuilder": {
  "ui": {
    "title": "Create agent",
    "startMessage": "Hi! Tell me about your business in one sentence, or start from a template.",
    "startPlaceholder": "e.g. I run a nail spa in Da Nang. Customers ask prices and want to book.",
    "templates": "Or start from a template",
    "suggesting": "Setting up your agent...",
    "suggestFailed": "I could not work that out on my own. Let's go through the questions.",
    "suggested": "I filled in what I could. Check the answers marked for review.",
    "auto": "Auto-filled",
    "check": "Please check",
    "required": "Please answer this question.",
    "skipped": "Skipped",
    "yes": "Yes",
    "no": "No",
    "editAnswer": "Edit answer",
    "draftCreated": "Your agent is saved as a draft. Try it in the chat, then keep going.",
    "saveFailed": "Could not save your agent. Your answers are kept, and we will retry on the next answer.",
    "done": "All set. Activate your agent when you are happy with it.",
    "finish": "Activate agent",
    "finished": "Your agent is active. You can change any answer above at any time.",
    "tryAgent": "Try your agent",
    "chatTab": "Chat",
    "promptTab": "What it is told",
    "testLocked": "Your agent appears here once the Rules step is done.",
    "progress": "Question {{current}} of {{total}}",
    "extraInstructions": "Extra instructions",
    "extraInstructionsHint": "Added at the end of what your agent is told. Leave it empty if your answers cover everything.",
    "editWithBuilder": "Edit with builder"
  },
  "groups": {
    "identity": "About your business",
    "essence": "Personality",
    "facts": "Business facts",
    "process": "How it works",
    "rules": "Rules",
    "interaction": "Conversation style"
  },
  "questions": {
    "businessType": { "title": "What kind of business is this agent for?" },
    "businessName": { "title": "What is your business called?", "placeholder": "Lotus Nail Spa" },
    "ownerName": { "title": "What should the assistant call you?" },
    "agentName": { "title": "What should we name your agent?", "placeholder": "Linh" },
    "channels": { "title": "Where do customers message you?" },
    "goals": { "title": "What should your agent do?", "description": "Pick everything that applies." },
    "greeting": { "title": "How should it greet people? (optional)", "placeholder": "Hi! This is Linh from Lotus Nail Spa. How can I help?" },
    "difference": { "title": "What makes you different? (optional)", "placeholder": "Hand-painted designs, 10 years of experience, free parking" },
    "personality": { "title": "Which words describe your brand?", "description": "Pick up to two." },
    "formality": { "title": "How formal should it be?" },
    "collect": { "title": "What details should it collect from customers?" },
    "handoffWhen": { "title": "When should it pass the chat to you?" },
    "rules": { "title": "What must it never do?" },
    "unsure": { "title": "What should it do when it does not know the answer?" },
    "replyLength": { "title": "How long should replies be?" },
    "emoji": { "title": "Should it use emoji?" },
    "addressStyle": { "title": "How should it address customers?" },
    "followUpQuestions": { "title": "Should it ask a follow-up question to keep the chat going?" },
    "afterHours": { "title": "What should it do outside opening hours?" }
  },
  "types": {
    "restaurant": "Restaurant & café",
    "beauty": "Beauty salon & spa",
    "healthcare": "Clinic & dental",
    "fashion": "Fashion & accessories",
    "cosmetics": "Cosmetics & skincare",
    "ecommerce": "Online shop",
    "real_estate": "Real estate",
    "education": "Education & courses",
    "hotel": "Hotel & homestay",
    "travel": "Travel & tours",
    "fitness": "Gym & fitness",
    "automotive": "Automotive",
    "finance": "Insurance & finance",
    "home_services": "Home services & interior",
    "studio_events": "Photo studio & events",
    "health_foods": "Health foods & supplements",
    "personal_scheduling": "Scheduling assistant",
    "personal_email": "Email assistant",
    "personal_tasks": "Tasks & reminders",
    "personal_research": "Research assistant",
    "personal_crm": "Personal CRM"
  },
  "goals": {
    "answer_questions": "Answer questions about products and prices",
    "recommend": "Recommend products or services",
    "take_orders": "Take orders",
    "book_appointments": "Book appointments",
    "reservations": "Take reservations",
    "capture_leads": "Collect contact details",
    "qualify_leads": "Qualify leads",
    "order_status": "Check order status",
    "after_sales": "After-sales support",
    "promotions": "Share promotions",
    "manage_schedule": "Manage my calendar",
    "triage_email": "Sort and draft my email",
    "track_tasks": "Track tasks and reminders",
    "research": "Research topics for me",
    "log_contacts": "Log contacts and follow-ups"
  },
  "rules": {
    "no_invented_prices": "Never guess prices or stock",
    "no_discount_promises": "Never promise unlisted discounts",
    "no_medical_advice": "No medical advice",
    "no_financial_advice": "No personal financial or legal advice",
    "no_competitors": "Do not talk about competitors",
    "no_personal_data_requests": "Only ask for details that are needed",
    "no_guarantees": "Never guarantee results",
    "no_health_claims": "No claims that products cure illness",
    "confirm_before_acting": "Ask me before sending, booking or deleting"
  },
  "unsure": {
    "handoff": "Say it will check, then pass the chat to me",
    "collect_contact": "Ask for a phone number or email",
    "say_unknown": "Say it does not know and suggest a next step"
  },
  "handoffWhen": {
    "asks_for_human": "The customer asks for a person",
    "upset": "The customer is upset",
    "unsure": "The agent is not sure",
    "large_order": "A large or unusual order",
    "complaint": "A complaint"
  },
  "collect": {
    "name": "Name",
    "phone": "Phone number",
    "email": "Email",
    "address": "Delivery address",
    "date_time": "Date and time",
    "party_size": "Number of people",
    "budget": "Budget",
    "product_interest": "Product or service of interest",
    "notes": "Special requests"
  },
  "personality": {
    "warm": "Warm",
    "expert": "Expert",
    "playful": "Playful",
    "premium": "Premium",
    "energetic": "Energetic",
    "calm": "Calm"
  },
  "formality": { "casual": "Casual", "balanced": "Balanced", "formal": "Formal" },
  "replyLength": {
    "short": "Short (1 to 2 sentences)",
    "medium": "Medium (a short paragraph)",
    "detailed": "Detailed when needed"
  },
  "addressStyle": {
    "em_anhchi": "Em / Anh Chị",
    "minh_ban": "Mình / Bạn",
    "shop_ban": "Shop / Bạn",
    "toi_quykhach": "Tôi / Quý khách"
  },
  "afterHours": {
    "reply_normally": "Reply as usual",
    "share_hours": "Reply and share opening hours",
    "promise_callback": "Promise a call back during opening hours"
  },
  "channels": {
    "messenger": "Facebook Messenger",
    "instagram": "Instagram",
    "zalo": "Zalo OA",
    "tiktok": "TikTok Shop",
    "shopee": "Shopee",
    "website": "Website chat"
  },
  "facts": {
    "opening_hours": { "title": "What are your opening hours?", "placeholder": "Mon to Sun, 9:00 to 21:00" },
    "address": { "title": "Where are you located?", "placeholder": "12 Bach Dang, Hai Chau, Da Nang" },
    "service_area": { "title": "Which areas do you serve?", "placeholder": "Inside Da Nang city" },
    "delivery": { "title": "Do you deliver? How?", "placeholder": "Grab and ShopeeFood within 5 km" },
    "shipping_fee": { "title": "What are your shipping fees and times?", "placeholder": "30k nationwide, free over 500k, 2 to 4 days" },
    "payment_methods": { "title": "How can customers pay?", "placeholder": "Cash, bank transfer, MoMo" },
    "return_policy": { "title": "What is your return or exchange policy?", "placeholder": "Exchange within 7 days with the receipt" },
    "warranty": { "title": "What warranty do you offer?", "placeholder": "12 months for parts and labour" },
    "menu_highlights": { "title": "What are your best dishes and their prices?", "placeholder": "Beef pho 55k, spring rolls 35k" },
    "reservation_policy": { "title": "How do reservations work?", "placeholder": "Book 2 hours ahead, tables held for 15 minutes" },
    "services_prices": { "title": "Which services do you offer and at what price?", "placeholder": "Gel nails 150k, pedicure 120k" },
    "deposit_policy": { "title": "Do you ask for a deposit? What if someone cancels?", "placeholder": "30% deposit, free cancellation 24 hours ahead" },
    "doctors_specialties": { "title": "Which doctors and specialties do you have?", "placeholder": "Dr. An, orthodontics; Dr. Binh, implants" },
    "insurance_accepted": { "title": "Which insurance do you accept?", "placeholder": "Bao Viet, PVI" },
    "size_guide": { "title": "How should customers choose a size?", "placeholder": "S under 50 kg, M 50 to 60 kg, L over 60 kg" },
    "stock_updates": { "title": "How can the agent know what is in stock?", "placeholder": "Ask staff; restock every Monday" },
    "skin_types": { "title": "Which products suit which skin types?", "placeholder": "Oily skin: gel cleanser; dry skin: cream cleanser" },
    "authenticity": { "title": "How do you prove products are authentic?", "placeholder": "Imported from Korea, with invoices" },
    "projects": { "title": "Which projects or listings do you have?", "placeholder": "Sun Riverside apartments, 2 bedrooms from 2.5 billion" },
    "price_range": { "title": "What is your price range?", "placeholder": "From 1.8 to 6 billion VND" },
    "courses": { "title": "Which courses do you offer and at what fee?", "placeholder": "IELTS 6.5 in 3 months, 8 million" },
    "schedule": { "title": "What is the class schedule?", "placeholder": "Mon, Wed, Fri evenings 18:00 to 20:00" },
    "level_test": { "title": "Do you offer a level test?", "placeholder": "Free 30 minute test online" },
    "room_types": { "title": "Which rooms do you have and at what price?", "placeholder": "Double room 600k per night, family room 1.1 million" },
    "checkin_policy": { "title": "What are check-in and check-out times?", "placeholder": "Check-in 14:00, check-out 12:00" },
    "tour_packages": { "title": "Which tours do you offer and at what price?", "placeholder": "Hoi An day tour 650k per person" },
    "visa_support": { "title": "Do you help with visas or documents?", "placeholder": "Korea tourist visa support, 2 weeks" },
    "membership_plans": { "title": "Which memberships do you offer and at what price?", "placeholder": "Monthly 500k, yearly 4.5 million" },
    "trial_class": { "title": "Do you offer a free trial?", "placeholder": "One free session, book a day ahead" },
    "car_models": { "title": "Which models do you sell and at what price?", "placeholder": "VF 5 from 468 million" },
    "test_drive": { "title": "How do test drives work?", "placeholder": "Book a day ahead, bring a driving licence" },
    "service_booking": { "title": "How can customers book maintenance?", "placeholder": "Weekdays 8:00 to 17:00, about 2 hours" },
    "products_plans": { "title": "Which products or plans do you offer?", "placeholder": "Health insurance from 2 million per year" },
    "eligibility": { "title": "Who can sign up?", "placeholder": "Ages 18 to 60, living in Vietnam" },
    "services_offered": { "title": "Which services do you offer?", "placeholder": "Aircon cleaning, plumbing, interior design" },
    "quote_process": { "title": "How do quotes work?", "placeholder": "Free site survey, quote within 24 hours" },
    "packages": { "title": "Which packages do you offer and at what price?", "placeholder": "Wedding photo package 12 million" },
    "booking_lead_time": { "title": "How far ahead should customers book?", "placeholder": "At least 2 weeks" },
    "key_ingredients": { "title": "What are the key ingredients?", "placeholder": "Collagen, vitamin C" },
    "certifications": { "title": "Which certifications do your products have?", "placeholder": "Ministry of Health registration, ISO 22000" },
    "working_hours": { "title": "When do you usually work?", "placeholder": "Weekdays 9:00 to 18:00, no meetings on Friday afternoon" },
    "priorities": { "title": "What matters most to you?", "placeholder": "Client meetings first, then team work" },
    "email_rules": { "title": "How should your email be handled?", "placeholder": "Flag anything from clients, archive newsletters" },
    "reminder_style": { "title": "How and when should you be reminded?", "placeholder": "A summary at 8:00 and a nudge 30 minutes before deadlines" },
    "sources": { "title": "Which sources do you trust?", "placeholder": "Official sites, VnExpress, industry reports" },
    "followup_cadence": { "title": "How often should you follow up with contacts?", "placeholder": "Every 2 weeks for warm leads" }
  }
}
```

Add this top-level block to `vi.json`:
```json
"agentBuilder": {
  "ui": {
    "title": "Tạo agent",
    "startMessage": "Chào bạn! Hãy mô tả việc kinh doanh của bạn trong một câu, hoặc chọn một mẫu có sẵn.",
    "startPlaceholder": "Ví dụ: Mình có tiệm nail ở Đà Nẵng. Khách hay hỏi giá và muốn đặt lịch.",
    "templates": "Hoặc bắt đầu từ mẫu",
    "suggesting": "Đang thiết lập agent...",
    "suggestFailed": "Mình chưa tự nhận diện được. Mình cùng trả lời vài câu hỏi nhé.",
    "suggested": "Mình đã điền sẵn những gì có thể. Bạn kiểm tra giúp các mục cần xem lại nhé.",
    "auto": "Tự động điền",
    "check": "Vui lòng kiểm tra",
    "required": "Vui lòng trả lời câu hỏi này.",
    "skipped": "Đã bỏ qua",
    "yes": "Có",
    "no": "Không",
    "editAnswer": "Sửa câu trả lời",
    "draftCreated": "Agent đã được lưu nháp. Hãy thử trò chuyện rồi tiếp tục nhé.",
    "saveFailed": "Chưa lưu được agent. Câu trả lời vẫn được giữ và sẽ thử lại ở câu tiếp theo.",
    "done": "Đã xong. Hãy kích hoạt agent khi bạn thấy hài lòng.",
    "finish": "Kích hoạt agent",
    "finished": "Agent đã được kích hoạt. Bạn có thể sửa bất kỳ câu trả lời nào ở trên.",
    "tryAgent": "Thử agent",
    "chatTab": "Trò chuyện",
    "promptTab": "Nội dung hướng dẫn",
    "testLocked": "Agent sẽ xuất hiện ở đây sau bước Quy tắc.",
    "progress": "Câu {{current}} / {{total}}",
    "extraInstructions": "Hướng dẫn bổ sung",
    "extraInstructionsHint": "Được thêm vào cuối phần hướng dẫn cho agent. Để trống nếu các câu trả lời đã đầy đủ.",
    "editWithBuilder": "Chỉnh sửa bằng trình tạo"
  },
  "groups": {
    "identity": "Về doanh nghiệp",
    "essence": "Tính cách",
    "facts": "Thông tin kinh doanh",
    "process": "Quy trình",
    "rules": "Quy tắc",
    "interaction": "Cách trò chuyện"
  },
  "questions": {
    "businessType": { "title": "Agent này dành cho loại hình kinh doanh nào?" },
    "businessName": { "title": "Tên doanh nghiệp của bạn là gì?", "placeholder": "Lotus Nail Spa" },
    "ownerName": { "title": "Trợ lý nên gọi bạn là gì?" },
    "agentName": { "title": "Bạn muốn đặt tên agent là gì?", "placeholder": "Linh" },
    "channels": { "title": "Khách hàng nhắn tin cho bạn ở đâu?" },
    "goals": { "title": "Agent của bạn cần làm những việc gì?", "description": "Chọn tất cả các mục phù hợp." },
    "greeting": { "title": "Agent nên chào như thế nào? (không bắt buộc)", "placeholder": "Chào bạn! Mình là Linh từ Lotus Nail Spa. Mình có thể giúp gì cho bạn?" },
    "difference": { "title": "Điều gì làm bạn khác biệt? (không bắt buộc)", "placeholder": "Mẫu vẽ tay, 10 năm kinh nghiệm, có chỗ đậu xe miễn phí" },
    "personality": { "title": "Những từ nào mô tả thương hiệu của bạn?", "description": "Chọn tối đa hai." },
    "formality": { "title": "Agent nên trang trọng đến mức nào?" },
    "collect": { "title": "Agent cần thu thập thông tin gì từ khách?" },
    "handoffWhen": { "title": "Khi nào agent nên chuyển cuộc trò chuyện cho bạn?" },
    "rules": { "title": "Agent tuyệt đối không được làm gì?" },
    "unsure": { "title": "Khi không biết câu trả lời, agent nên làm gì?" },
    "replyLength": { "title": "Câu trả lời nên dài bao nhiêu?" },
    "emoji": { "title": "Agent có dùng emoji không?" },
    "addressStyle": { "title": "Agent nên xưng hô với khách như thế nào?" },
    "followUpQuestions": { "title": "Agent có nên hỏi thêm để tiếp tục cuộc trò chuyện không?" },
    "afterHours": { "title": "Ngoài giờ làm việc, agent nên làm gì?" }
  },
  "types": {
    "restaurant": "Nhà hàng & quán cà phê",
    "beauty": "Salon làm đẹp & spa",
    "healthcare": "Phòng khám & nha khoa",
    "fashion": "Thời trang & phụ kiện",
    "cosmetics": "Mỹ phẩm & chăm sóc da",
    "ecommerce": "Cửa hàng online",
    "real_estate": "Bất động sản",
    "education": "Giáo dục & khóa học",
    "hotel": "Khách sạn & homestay",
    "travel": "Du lịch & tour",
    "fitness": "Gym & thể hình",
    "automotive": "Ô tô & xe máy",
    "finance": "Bảo hiểm & tài chính",
    "home_services": "Dịch vụ tại nhà & nội thất",
    "studio_events": "Studio ảnh & sự kiện",
    "health_foods": "Thực phẩm chức năng",
    "personal_scheduling": "Trợ lý lịch hẹn",
    "personal_email": "Trợ lý email",
    "personal_tasks": "Công việc & nhắc nhở",
    "personal_research": "Trợ lý nghiên cứu",
    "personal_crm": "CRM cá nhân"
  },
  "goals": {
    "answer_questions": "Trả lời câu hỏi về sản phẩm và giá",
    "recommend": "Tư vấn sản phẩm hoặc dịch vụ",
    "take_orders": "Nhận đơn hàng",
    "book_appointments": "Đặt lịch hẹn",
    "reservations": "Nhận đặt bàn, đặt phòng",
    "capture_leads": "Thu thập thông tin liên hệ",
    "qualify_leads": "Sàng lọc khách tiềm năng",
    "order_status": "Kiểm tra tình trạng đơn hàng",
    "after_sales": "Hỗ trợ sau bán hàng",
    "promotions": "Giới thiệu khuyến mãi",
    "manage_schedule": "Quản lý lịch của tôi",
    "triage_email": "Phân loại và soạn email",
    "track_tasks": "Theo dõi công việc và nhắc nhở",
    "research": "Tìm hiểu thông tin giúp tôi",
    "log_contacts": "Ghi lại liên hệ và lịch theo dõi"
  },
  "rules": {
    "no_invented_prices": "Không tự đoán giá hoặc tồn kho",
    "no_discount_promises": "Không hứa giảm giá ngoài chính sách",
    "no_medical_advice": "Không tư vấn y khoa",
    "no_financial_advice": "Không tư vấn tài chính, pháp lý cá nhân",
    "no_competitors": "Không nhắc đến đối thủ",
    "no_personal_data_requests": "Chỉ hỏi thông tin thật sự cần",
    "no_guarantees": "Không cam kết kết quả",
    "no_health_claims": "Không nói sản phẩm chữa được bệnh",
    "confirm_before_acting": "Hỏi tôi trước khi gửi, đặt lịch hoặc xóa"
  },
  "unsure": {
    "handoff": "Báo sẽ kiểm tra rồi chuyển cho tôi",
    "collect_contact": "Xin số điện thoại hoặc email",
    "say_unknown": "Nói chưa rõ và gợi ý bước tiếp theo"
  },
  "handoffWhen": {
    "asks_for_human": "Khách muốn nói chuyện với người thật",
    "upset": "Khách không hài lòng",
    "unsure": "Agent không chắc câu trả lời",
    "large_order": "Đơn hàng lớn hoặc bất thường",
    "complaint": "Có khiếu nại"
  },
  "collect": {
    "name": "Họ tên",
    "phone": "Số điện thoại",
    "email": "Email",
    "address": "Địa chỉ giao hàng",
    "date_time": "Ngày và giờ",
    "party_size": "Số người",
    "budget": "Ngân sách",
    "product_interest": "Sản phẩm hoặc dịch vụ quan tâm",
    "notes": "Yêu cầu đặc biệt"
  },
  "personality": {
    "warm": "Ấm áp",
    "expert": "Chuyên nghiệp",
    "playful": "Vui vẻ",
    "premium": "Sang trọng",
    "energetic": "Năng động",
    "calm": "Điềm tĩnh"
  },
  "formality": { "casual": "Thân mật", "balanced": "Vừa phải", "formal": "Trang trọng" },
  "replyLength": {
    "short": "Ngắn (1 đến 2 câu)",
    "medium": "Vừa (một đoạn ngắn)",
    "detailed": "Chi tiết khi cần"
  },
  "addressStyle": {
    "em_anhchi": "Em / Anh Chị",
    "minh_ban": "Mình / Bạn",
    "shop_ban": "Shop / Bạn",
    "toi_quykhach": "Tôi / Quý khách"
  },
  "afterHours": {
    "reply_normally": "Trả lời bình thường",
    "share_hours": "Trả lời và báo giờ mở cửa",
    "promise_callback": "Hẹn liên hệ lại trong giờ làm việc"
  },
  "channels": {
    "messenger": "Facebook Messenger",
    "instagram": "Instagram",
    "zalo": "Zalo OA",
    "tiktok": "TikTok Shop",
    "shopee": "Shopee",
    "website": "Chat trên website"
  },
  "facts": {
    "opening_hours": { "title": "Giờ mở cửa của bạn là khi nào?", "placeholder": "Thứ 2 đến Chủ nhật, 9:00 đến 21:00" },
    "address": { "title": "Địa chỉ và chi nhánh của bạn ở đâu?", "placeholder": "12 Bạch Đằng, Hải Châu, Đà Nẵng" },
    "service_area": { "title": "Bạn phục vụ khu vực nào?", "placeholder": "Trong nội thành Đà Nẵng" },
    "delivery": { "title": "Bạn có giao hàng không? Giao như thế nào?", "placeholder": "Qua Grab và ShopeeFood trong bán kính 5 km" },
    "shipping_fee": { "title": "Phí và thời gian giao hàng thế nào?", "placeholder": "30k toàn quốc, miễn phí đơn từ 500k, 2 đến 4 ngày" },
    "payment_methods": { "title": "Khách có thể thanh toán bằng cách nào?", "placeholder": "Tiền mặt, chuyển khoản, MoMo" },
    "return_policy": { "title": "Chính sách đổi trả của bạn là gì?", "placeholder": "Đổi trong 7 ngày kèm hóa đơn" },
    "warranty": { "title": "Chính sách bảo hành thế nào?", "placeholder": "Bảo hành 12 tháng linh kiện và công" },
    "menu_highlights": { "title": "Món nổi bật và giá của bạn là gì?", "placeholder": "Phở bò 55k, chả giò 35k" },
    "reservation_policy": { "title": "Việc đặt bàn diễn ra như thế nào?", "placeholder": "Đặt trước 2 tiếng, giữ bàn 15 phút" },
    "services_prices": { "title": "Bạn có những dịch vụ nào và giá bao nhiêu?", "placeholder": "Sơn gel 150k, chăm sóc chân 120k" },
    "deposit_policy": { "title": "Bạn có yêu cầu đặt cọc không? Nếu khách hủy thì sao?", "placeholder": "Cọc 30%, hủy miễn phí trước 24 giờ" },
    "doctors_specialties": { "title": "Bạn có những bác sĩ và chuyên khoa nào?", "placeholder": "BS. An chỉnh nha; BS. Bình cấy ghép implant" },
    "insurance_accepted": { "title": "Bạn chấp nhận những loại bảo hiểm nào?", "placeholder": "Bảo Việt, PVI" },
    "size_guide": { "title": "Khách nên chọn size như thế nào?", "placeholder": "S dưới 50 kg, M 50 đến 60 kg, L trên 60 kg" },
    "stock_updates": { "title": "Làm sao agent biết hàng nào còn?", "placeholder": "Hỏi nhân viên; nhập hàng mỗi thứ 2" },
    "skin_types": { "title": "Sản phẩm nào hợp với loại da nào?", "placeholder": "Da dầu: sữa rửa mặt dạng gel; da khô: dạng kem" },
    "authenticity": { "title": "Bạn chứng minh hàng chính hãng như thế nào?", "placeholder": "Nhập khẩu Hàn Quốc, có hóa đơn" },
    "projects": { "title": "Bạn đang có dự án hoặc sản phẩm nào?", "placeholder": "Căn hộ Sun Riverside, 2 phòng ngủ từ 2,5 tỷ" },
    "price_range": { "title": "Khoảng giá của bạn là bao nhiêu?", "placeholder": "Từ 1,8 đến 6 tỷ đồng" },
    "courses": { "title": "Bạn có những khóa học nào và học phí bao nhiêu?", "placeholder": "IELTS 6.5 trong 3 tháng, 8 triệu" },
    "schedule": { "title": "Lịch học như thế nào?", "placeholder": "Tối thứ 2, 4, 6 từ 18:00 đến 20:00" },
    "level_test": { "title": "Bạn có kiểm tra trình độ đầu vào không?", "placeholder": "Kiểm tra miễn phí 30 phút online" },
    "room_types": { "title": "Bạn có những loại phòng nào và giá bao nhiêu?", "placeholder": "Phòng đôi 600k/đêm, phòng gia đình 1,1 triệu" },
    "checkin_policy": { "title": "Giờ nhận và trả phòng là khi nào?", "placeholder": "Nhận phòng 14:00, trả phòng 12:00" },
    "tour_packages": { "title": "Bạn có những tour nào và giá bao nhiêu?", "placeholder": "Tour Hội An 1 ngày 650k/người" },
    "visa_support": { "title": "Bạn có hỗ trợ visa hoặc giấy tờ không?", "placeholder": "Hỗ trợ visa du lịch Hàn Quốc, 2 tuần" },
    "membership_plans": { "title": "Bạn có những gói thành viên nào và giá bao nhiêu?", "placeholder": "Gói tháng 500k, gói năm 4,5 triệu" },
    "trial_class": { "title": "Bạn có buổi tập thử miễn phí không?", "placeholder": "Một buổi miễn phí, đặt trước 1 ngày" },
    "car_models": { "title": "Bạn bán những mẫu xe nào và giá bao nhiêu?", "placeholder": "VF 5 từ 468 triệu" },
    "test_drive": { "title": "Lái thử diễn ra như thế nào?", "placeholder": "Đặt trước 1 ngày, mang theo bằng lái" },
    "service_booking": { "title": "Khách đặt lịch bảo dưỡng như thế nào?", "placeholder": "Ngày thường 8:00 đến 17:00, khoảng 2 tiếng" },
    "products_plans": { "title": "Bạn có những sản phẩm hoặc gói nào?", "placeholder": "Bảo hiểm sức khỏe từ 2 triệu/năm" },
    "eligibility": { "title": "Ai có thể đăng ký?", "placeholder": "Từ 18 đến 60 tuổi, sống tại Việt Nam" },
    "services_offered": { "title": "Bạn cung cấp những dịch vụ nào?", "placeholder": "Vệ sinh máy lạnh, sửa ống nước, thiết kế nội thất" },
    "quote_process": { "title": "Báo giá được thực hiện thế nào?", "placeholder": "Khảo sát miễn phí, báo giá trong 24 giờ" },
    "packages": { "title": "Bạn có những gói nào và giá bao nhiêu?", "placeholder": "Gói chụp cưới 12 triệu" },
    "booking_lead_time": { "title": "Khách nên đặt trước bao lâu?", "placeholder": "Ít nhất 2 tuần" },
    "key_ingredients": { "title": "Thành phần chính là gì?", "placeholder": "Collagen, vitamin C" },
    "certifications": { "title": "Sản phẩm của bạn có những chứng nhận nào?", "placeholder": "Giấy công bố Bộ Y tế, ISO 22000" },
    "working_hours": { "title": "Bạn thường làm việc vào khung giờ nào?", "placeholder": "Ngày thường 9:00 đến 18:00, không họp chiều thứ 6" },
    "priorities": { "title": "Điều gì quan trọng nhất với bạn?", "placeholder": "Ưu tiên gặp khách hàng, sau đó đến việc nhóm" },
    "email_rules": { "title": "Email của bạn nên được xử lý thế nào?", "placeholder": "Đánh dấu email từ khách hàng, lưu trữ bản tin" },
    "reminder_style": { "title": "Bạn muốn được nhắc như thế nào và khi nào?", "placeholder": "Tóm tắt lúc 8:00 và nhắc trước hạn 30 phút" },
    "sources": { "title": "Bạn tin tưởng những nguồn nào?", "placeholder": "Trang chính thức, VnExpress, báo cáo ngành" },
    "followup_cadence": { "title": "Bạn nên liên hệ lại với khách bao lâu một lần?", "placeholder": "Mỗi 2 tuần với khách tiềm năng" }
  }
}
```

Run `pnpm prettier --write apps/app/src/i18n/translations/en.json apps/app/src/i18n/translations/vi.json` to normalise formatting.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter app test i18n-keys`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/app/package.json apps/app/src/i18n apps/app/src/routes/chatbot/chatbot-create/agent-builder pnpm-lock.yaml
git commit -m "feat(app): agent builder translations in en and vi"
```

---

### Task 10: Builder state reducer and chatbot payload

**Files:**
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/builder-state.ts`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/to-chatbot-payload.ts`
- Test: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/builder-state.test.ts`
- Test: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/to-chatbot-payload.test.ts`

**Interfaces:**
- Consumes: `buildQuestionGroups`, `writeAnswer`, `DRAFT_GROUPS`, `createProfile`, `AgentProfile`, `AgentSuggestion`, `Question`, `QuestionGroup` from `@repo/agent-blueprint`, plus `CHATBOT_FORM_DEFAULTS` from `apps/app/src/routes/chatbot/constants.ts`.
- Produces:
  - `BuilderState = { profile: AgentProfile | null; suggestion: AgentSuggestion | null; source: "describe" | "template" | "hydrate" | null; answered: string[]; editing: string | null; chatbotId: string | null; finished: boolean }`
  - `BuilderAction` =
    - `{ type: "start"; profile; suggestion; source: "describe" | "template" }`
    - `{ type: "hydrate"; profile; chatbotId; finished }`
    - `{ type: "answer"; question: Question; value: unknown }`
    - `{ type: "skip"; question: Question }`
    - `{ type: "edit"; questionId: string }`
    - `{ type: "draftCreated"; chatbotId: string }`
    - `{ type: "finished" }`
  - `initialBuilderState`, `builderReducer(state, action)`, `Step = { group: QuestionGroup; question: Question }`, `steps(profile): Step[]`, `currentStep(state): Step | null`, `isDraftReady(state): boolean`, `isComplete(state): boolean`
  - `toChatbotPayload(profile: AgentProfile, extraInstructions: string, base?: Partial<ChatbotCreateRequestDto>): ChatbotCreateRequestDto`

- [ ] **Step 1: Write the failing tests**

`builder-state.test.ts`:
```ts
import { createProfile } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import {
  builderReducer, currentStep, initialBuilderState, isComplete, isDraftReady, steps, type BuilderState,
} from "./builder-state";

const started = (): BuilderState =>
  builderReducer(initialBuilderState, { type: "start", profile: createProfile("beauty", "vi"), suggestion: null, source: "template" });

function answerAllUntil(state: BuilderState, stop: (s: BuilderState) => boolean): BuilderState {
  let s = state;
  for (let guard = 0; guard < 100 && !stop(s); guard++) {
    const step = currentStep(s)!;
    s = builderReducer(s, { type: "skip", question: step.question });
  }
  return s;
}

describe("builderReducer", () => {
  it("starts on the first identity question", () => {
    expect(currentStep(started())?.question.id).toBe("businessType");
  });

  it("records an answer and moves to the next question", () => {
    const s0 = started();
    const s1 = builderReducer(s0, { type: "answer", question: currentStep(s0)!.question, value: "beauty" });
    expect(s1.answered).toEqual(["businessType"]);
    expect(currentStep(s1)?.question.id).toBe("businessName");
  });

  it("re-opens an answered question for editing, then resumes", () => {
    const s1 = builderReducer(started(), { type: "skip", question: currentStep(started())!.question });
    const editing = builderReducer(s1, { type: "edit", questionId: "businessType" });
    expect(currentStep(editing)?.question.id).toBe("businessType");
    const back = builderReducer(editing, { type: "answer", question: currentStep(editing)!.question, value: "beauty" });
    expect(back.editing).toBeNull();
    expect(currentStep(back)?.question.id).toBe("businessName");
  });

  it("resets later answers when the business type changes", () => {
    const s = answerAllUntil(started(), (x) => x.answered.includes("greeting"));
    const edited = builderReducer(builderReducer(s, { type: "edit", questionId: "businessType" }), {
      type: "answer", question: steps(s.profile!)[0].question, value: "restaurant",
    });
    expect(edited.profile!.goals).toContain("reservations");
    expect(edited.answered).toEqual(["businessType"]);
  });

  it("is draft-ready only after every question up to Rules is answered or skipped", () => {
    const s = answerAllUntil(started(), isDraftReady);
    expect(isDraftReady(s)).toBe(true);
    expect(currentStep(s)?.group.id).toBe("interaction");
    expect(isComplete(s)).toBe(false);
    expect(isComplete(answerAllUntil(s, isComplete))).toBe(true);
  });

  it("hydrates an existing builder chatbot as fully answered", () => {
    const s = builderReducer(initialBuilderState, { type: "hydrate", profile: createProfile("hotel", "en"), chatbotId: "c1", finished: true });
    expect(isComplete(s)).toBe(true);
    expect(s.chatbotId).toBe("c1");
  });
});
```

`to-chatbot-payload.test.ts`:
```ts
import { createProfile } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import { toChatbotPayload } from "./to-chatbot-payload";

describe("toChatbotPayload", () => {
  const profile = { ...createProfile("beauty", "vi"), businessName: "Lotus", agentName: "Linh", greeting: "Chào bạn!" };

  it("maps builder answers onto a full create payload", () => {
    const body = toChatbotPayload(profile, "Closed Mondays");
    expect(body).toMatchObject({
      name: "Linh", type: "beauty", primaryLanguage: "vi", deferedLanguage: "vi",
      welcomeMessage: "Chào bạn!", agentProfile: profile, extraInstructions: "Closed Mondays",
      autoRead: true, typingIndicator: true, accounts: [],
    });
    expect(body.modelTextName).toBeTruthy();
  });

  it("keeps fields the builder does not own when a base is given", () => {
    const body = toChatbotPayload(profile, "", { accounts: ["a1"], guardrailEnabled: true, modelTextName: "openai/gpt-5.4" } as never);
    expect(body.accounts).toEqual(["a1"]);
    expect(body.guardrailEnabled).toBe(true);
    expect(body.modelTextName).toBe("openai/gpt-5.4");
  });

  it("falls back to the business name, then a default name", () => {
    expect(toChatbotPayload({ ...profile, agentName: "" }, "").name).toBe("Lotus");
    expect(toChatbotPayload({ ...profile, agentName: "", businessName: "" }, "").name).toBe("Agent");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter app test builder-state to-chatbot-payload`
Expected: FAIL with "Failed to resolve import "./builder-state"" and "./to-chatbot-payload".

- [ ] **Step 3: Implement**

`builder-state.ts`:
```ts
import {
  DRAFT_GROUPS, buildQuestionGroups, writeAnswer,
  type AgentProfile, type AgentSuggestion, type Question, type QuestionGroup,
} from "@repo/agent-blueprint";

export type BuilderState = {
  profile: AgentProfile | null;
  suggestion: AgentSuggestion | null;
  source: "describe" | "template" | "hydrate" | null;
  answered: string[];
  editing: string | null;
  chatbotId: string | null;
  finished: boolean;
};

export type BuilderAction =
  | { type: "start"; profile: AgentProfile; suggestion: AgentSuggestion | null; source: "describe" | "template" }
  | { type: "hydrate"; profile: AgentProfile; chatbotId: string; finished: boolean }
  | { type: "answer"; question: Question; value: unknown }
  | { type: "skip"; question: Question }
  | { type: "edit"; questionId: string }
  | { type: "draftCreated"; chatbotId: string }
  | { type: "finished" };

export type Step = { group: QuestionGroup; question: Question };

export const initialBuilderState: BuilderState = {
  profile: null, suggestion: null, source: null, answered: [], editing: null, chatbotId: null, finished: false,
};

export function steps(profile: AgentProfile): Step[] {
  return buildQuestionGroups(profile).flatMap((group) => group.questions.map((question) => ({ group, question })));
}

export function currentStep(state: BuilderState): Step | null {
  if (!state.profile) return null;
  const all = steps(state.profile);
  if (state.editing) return all.find((s) => s.question.id === state.editing) ?? null;
  return all.find((s) => !state.answered.includes(s.question.id)) ?? null;
}

export function isDraftReady(state: BuilderState): boolean {
  if (!state.profile) return false;
  return steps(state.profile)
    .filter((s) => DRAFT_GROUPS.includes(s.group.id))
    .every((s) => state.answered.includes(s.question.id));
}

export function isComplete(state: BuilderState): boolean {
  return !!state.profile && currentStep({ ...state, editing: null }) === null;
}

const addOnce = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "start":
      return { ...initialBuilderState, profile: action.profile, suggestion: action.suggestion, source: action.source };
    case "hydrate":
      return {
        ...initialBuilderState,
        profile: action.profile,
        source: "hydrate",
        chatbotId: action.chatbotId,
        finished: action.finished,
        answered: steps(action.profile).map((s) => s.question.id),
      };
    case "answer": {
      if (!state.profile) return state;
      const typeChanged = action.question.id === "businessType" && action.value !== state.profile.businessType;
      const profile = writeAnswer(state.profile, action.question.path, action.value);
      // A new business type brings new presets and questions, so only the
      // type itself stays answered.
      const answered = typeChanged ? ["businessType"] : addOnce(state.answered, action.question.id);
      return { ...state, profile, answered, editing: null };
    }
    case "skip":
      return { ...state, answered: addOnce(state.answered, action.question.id), editing: null };
    case "edit":
      return { ...state, editing: action.questionId };
    case "draftCreated":
      return { ...state, chatbotId: action.chatbotId };
    case "finished":
      return { ...state, finished: true };
  }
}
```

`to-chatbot-payload.ts`:
```ts
import type { AgentProfile } from "@repo/agent-blueprint";
import type { ChatbotCreateRequestDto } from "@repo/client";
import { CHATBOT_FORM_DEFAULTS } from "../../constants";

/**
 * The full chatbot body for create and update. The update endpoint writes
 * every editable field (unsent ones become undefined), so the builder always
 * sends everything: builder-owned fields from the profile, the rest from
 * `base` (the existing chatbot) or the form defaults.
 */
export function toChatbotPayload(
  profile: AgentProfile,
  extraInstructions: string,
  base: Partial<ChatbotCreateRequestDto> = {},
): ChatbotCreateRequestDto {
  const language = profile.primaryLanguage as ChatbotCreateRequestDto["primaryLanguage"];
  return {
    autoRead: CHATBOT_FORM_DEFAULTS.autoRead,
    typingIndicator: CHATBOT_FORM_DEFAULTS.typingIndicator,
    accounts: [],
    modelTextName: CHATBOT_FORM_DEFAULTS.modelTextName,
    modelTemperature: CHATBOT_FORM_DEFAULTS.modelTemperature,
    fallbackMessage: "",
    guardrailEnabled: CHATBOT_FORM_DEFAULTS.guardrailEnabled,
    guardrailModelEnabled: CHATBOT_FORM_DEFAULTS.guardrailModelEnabled,
    guardrailCustomInstruction: "",
    guardrailEscalateOnBlock: CHATBOT_FORM_DEFAULTS.guardrailEscalateOnBlock,
    followupRules: "",
    ...base,
    name: profile.agentName.trim() || profile.businessName.trim() || "Agent",
    type: profile.businessType as ChatbotCreateRequestDto["type"],
    primaryLanguage: language,
    deferedLanguage: language,
    welcomeMessage: profile.greeting,
    agentProfile: profile as unknown as Record<string, unknown>,
    extraInstructions,
  } as ChatbotCreateRequestDto;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter app test builder-state to-chatbot-payload`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/routes/chatbot/chatbot-create/agent-builder
git commit -m "feat(app): agent builder state and chatbot payload mapping"
```

---

### Task 11: Conversational builder UI on the create route

**Files:**
- Create: `apps/app/src/hooks/api/agent-builder.ts`
- Modify: `apps/app/src/hooks/api/index.ts` (add `export * from "./agent-builder";`)
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/use-agent-builder.ts`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/components/start-composer.tsx`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/components/question-message.tsx`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/components/answer-message.tsx`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/components/builder-thread.tsx`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/components/test-panel.tsx`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/agent-builder.tsx`
- Modify: `apps/app/src/routes/chatbot/chatbot-create/chatbot-create.tsx`
- Delete: `apps/app/src/routes/chatbot/chatbot-create/components/` (the old create form, replaced by the builder)
- Test: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/agent-builder.test.tsx`

**Interfaces:**
- Consumes:
  - Task 10: `builderReducer`, `currentStep`, `isDraftReady`, `isComplete`, `steps`, `toChatbotPayload`.
  - Task 6: the Questionnaire parts.
  - `Message`, `MessageContent`, `MessageResponse`, `Marker`, `MarkerContent`, `MessageScroller*`, `PromptInput*` from `@repo/ui/common-components`.
  - `useCreateChatbot`, `useUpdateChatbot`, `useToggleChatbotActivate`, `useChatbot` from `@/hooks/api`.
  - `agentBuilderWorkspaceControllerSuggestV1` from `@repo/client`.
  - `AIChatCard`, `AIChatInput`, `workspaceChatTransport` from `@/components/ai-chat/*`, and `useAuthToken` from `@/modules/auth`.
- Produces:
  - `useAgentBuilderSuggest()`: a mutation taking `description: string` and resolving to `AgentSuggestion | null`.
  - `useAgentBuilder({ hydrateFrom })` returns:
    - `state`, `dispatch`
    - `startFromDescription(text)`, `startFromTemplate(type)`
    - `starting: boolean`, `saveError: boolean`
    - `finish()`, `finishing: boolean`
    - `extraInstructions: string`
  - Route behavior:
    - `/:workspace/chatbot/create` renders the builder.
    - `/:workspace/chatbot/create?chatbotId=<id>` reopens a builder bot for editing.

- [ ] **Step 1: Write the failing test**

`agent-builder.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentBuilder } from "./agent-builder";

const create = vi.fn();
const update = vi.fn();
const suggest = vi.fn();

vi.mock("@/hooks/api", () => ({
  useCreateChatbot: () => ({ mutateAsync: create }),
  useUpdateChatbot: () => ({ mutateAsync: update }),
  useToggleChatbotActivate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useChatbot: () => ({ chatbot: undefined }),
}));
vi.mock("@/hooks/api/agent-builder", () => ({
  useAgentBuilderSuggest: () => ({ mutateAsync: suggest, isPending: false }),
}));
vi.mock("./components/test-panel", () => ({
  TestPanel: ({ chatbotId }: { chatbotId: string | null }) => <div data-testid="test-panel">{chatbotId ?? "locked"}</div>,
}));
vi.mock("@/components/modals", () => ({
  RouteFocusModal: { Header: ({ children }: never) => <div>{children}</div>, Body: ({ children }: never) => <div>{children}</div> },
}));

const renderBuilder = () => render(<MemoryRouter initialEntries={["/ws/chatbot/create"]}><AgentBuilder /></MemoryRouter>);

// Answers the open question with whatever makes it valid, then clicks Next.
async function answerCurrent() {
  const text = screen.queryByRole("textbox", { name: /agentBuilder\.(questions|facts)/ });
  if (text && !(text as HTMLInputElement).value) await userEvent.type(text, "Lotus");
  await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
}

describe("AgentBuilder", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ data: { data: { id: "bot-1" } } });
    update.mockReset().mockResolvedValue({});
    suggest.mockReset();
  });

  it("starts from a template and asks the first question", async () => {
    renderBuilder();
    await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
    expect(screen.getByText("agentBuilder.groups.identity")).toBeInTheDocument();
  });

  it("shows the suggestion badge after describing the business", async () => {
    suggest.mockResolvedValue({ businessType: { value: "beauty", confidence: 0.95 }, personality: null, formality: null, goals: {}, rules: {} });
    renderBuilder();
    await userEvent.type(screen.getByPlaceholderText("agentBuilder.ui.startPlaceholder"), "Nail spa in Da Nang{enter}");
    await screen.findByText("agentBuilder.ui.auto");
    expect(screen.getByText("agentBuilder.ui.suggested")).toBeInTheDocument();
  });

  it("keeps going with plain questions when the suggestion fails", async () => {
    suggest.mockRejectedValue(new Error("down"));
    renderBuilder();
    await userEvent.type(screen.getByPlaceholderText("agentBuilder.ui.startPlaceholder"), "something{enter}");
    await screen.findByText("agentBuilder.ui.suggestFailed");
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
  });

  it("creates an inactive draft once the Rules group is done and unlocks the test panel", async () => {
    renderBuilder();
    await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
    for (let i = 0; i < 40 && create.mock.calls.length === 0; i++) await answerCurrent();
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toMatchObject({ status: "inactive", type: "beauty", name: "Lotus", agentProfile: expect.objectContaining({ businessName: "Lotus" }) });
    await waitFor(() => expect(screen.getByTestId("test-panel")).toHaveTextContent("bot-1"));
    expect(screen.getByText("agentBuilder.ui.draftCreated")).toBeInTheDocument();
  });

  it("lets the user edit an earlier answer", async () => {
    renderBuilder();
    await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
    await answerCurrent();
    await userEvent.click(screen.getByTitle("agentBuilder.ui.editAnswer"));
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter app test agent-builder.test`
Expected: FAIL with "Failed to resolve import "./agent-builder"".

- [ ] **Step 3: Implement the suggest hook**

`apps/app/src/hooks/api/agent-builder.ts`:
```ts
import type { AgentSuggestion } from "@repo/agent-blueprint";
import { agentBuilderWorkspaceControllerSuggestV1 } from "@repo/client";
import { useMutation } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const useAgentBuilderSuggest = () => {
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (description: string) =>
      agentBuilderWorkspaceControllerSuggestV1({
        path: { workspace: workspace!.slug },
        body: { description },
      }).then((res) => (res.data?.data ?? null) as AgentSuggestion | null),
  });
};
```
Add `export * from "./agent-builder";` to `apps/app/src/hooks/api/index.ts`.

- [ ] **Step 4: Implement `use-agent-builder.ts`**

```ts
import {
  applySuggestion, createProfile, type AgentProfile, type BusinessTypeId,
} from "@repo/agent-blueprint";
import type { ChatbotCreateRequestDto, ChatbotGetDetailResponseDto } from "@repo/client";
import { useCreateChatbot, useToggleChatbotActivate, useUpdateChatbot } from "@/hooks/api";
import { useAgentBuilderSuggest } from "@/hooks/api/agent-builder";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { builderReducer, initialBuilderState, isDraftReady } from "./builder-state";
import { toChatbotPayload } from "./to-chatbot-payload";

const SAVE_DEBOUNCE_MS = 600;

function baseFrom(chatbot: ChatbotGetDetailResponseDto): Partial<ChatbotCreateRequestDto> {
  const { accounts, ...rest } = chatbot as ChatbotGetDetailResponseDto & { accounts?: { id: string }[] };
  return { ...(rest as Partial<ChatbotCreateRequestDto>), accounts: (accounts ?? []).map((a) => a.id) };
}

export function useAgentBuilder({ hydrateFrom }: { hydrateFrom?: ChatbotGetDetailResponseDto }) {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith("vi") ? "vi" : "en";
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState);
  const suggest = useAgentBuilderSuggest();
  const create = useCreateChatbot();
  const update = useUpdateChatbot();
  const activate = useToggleChatbotActivate();
  const [starting, setStarting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const creating = useRef(false);
  const lastSaved = useRef("");

  const extraInstructions = hydrateFrom?.extraInstructions ?? "";
  const base = useMemo(() => (hydrateFrom ? baseFrom(hydrateFrom) : undefined), [hydrateFrom]);

  useEffect(() => {
    if (!hydrateFrom?.agentProfile) return;
    const profile = hydrateFrom.agentProfile as unknown as AgentProfile;
    lastSaved.current = JSON.stringify(toChatbotPayload(profile, extraInstructions, base));
    dispatch({ type: "hydrate", profile, chatbotId: hydrateFrom.id, finished: hydrateFrom.status === "active" });
  }, [hydrateFrom, extraInstructions, base]);

  const startFromDescription = async (description: string) => {
    setStarting(true);
    const suggestion = await suggest.mutateAsync(description).catch(() => null);
    setStarting(false);
    const profile = suggestion ? applySuggestion(suggestion, language) : null;
    dispatch({
      type: "start",
      profile: profile ?? createProfile("ecommerce", language),
      suggestion: profile ? suggestion : null,
      source: "describe",
    });
  };

  const startFromTemplate = (type: BusinessTypeId) =>
    dispatch({ type: "start", profile: createProfile(type, language), suggestion: null, source: "template" });

  // Create the inactive draft as soon as everything up to Rules is answered.
  // A failure is retried on the next state change (the next answer).
  useEffect(() => {
    if (!state.profile || state.chatbotId || creating.current || !isDraftReady(state)) return;
    creating.current = true;
    const body = toChatbotPayload(state.profile, extraInstructions, base);
    create
      .mutateAsync({ ...body, status: "inactive" } as ChatbotCreateRequestDto)
      .then((res) => {
        const id = (res as { data?: { data?: { id?: string } } }).data?.data?.id;
        if (!id) throw new Error("missing chatbot id");
        lastSaved.current = JSON.stringify(body);
        setSaveError(false);
        dispatch({ type: "draftCreated", chatbotId: id });
      })
      .catch(() => setSaveError(true))
      .finally(() => {
        creating.current = false;
      });
  }, [state, extraInstructions, base, create]);

  // After the draft exists, every answer saves the full payload (debounced).
  useEffect(() => {
    if (!state.chatbotId || !state.profile) return;
    const body = toChatbotPayload(state.profile, extraInstructions, base);
    const snapshot = JSON.stringify(body);
    if (snapshot === lastSaved.current) return;
    const id = state.chatbotId;
    const timer = setTimeout(() => {
      update
        .mutateAsync({ id, body })
        .then(() => {
          lastSaved.current = snapshot;
          setSaveError(false);
        })
        .catch(() => setSaveError(true));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.chatbotId, state.profile, extraInstructions, base, update]);

  const finish = async () => {
    if (!state.chatbotId) return;
    await activate.mutateAsync({ id: state.chatbotId, active: true });
    dispatch({ type: "finished" });
  };

  return {
    state, dispatch, startFromDescription, startFromTemplate, starting, saveError,
    finish, finishing: activate.isPending, extraInstructions,
  };
}

export type AgentBuilderController = ReturnType<typeof useAgentBuilder>;
```

- [ ] **Step 5: Implement the components**

`components/start-composer.tsx`:
```tsx
import { TEMPLATE_TYPES, type BusinessTypeId } from "@repo/agent-blueprint";
import { Button, Text } from "@medusajs/ui";
import {
  Marker, MarkerContent, Message, MessageContent, PromptInput, PromptInputBody,
  PromptInputFooter, PromptInputSubmit, PromptInputTextarea,
} from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type Props = { loading: boolean; onDescribe: (text: string) => void; onTemplate: (type: BusinessTypeId) => void };

export function StartComposer({ loading, onDescribe, onTemplate }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <Message from="assistant">
        <MessageContent>{t("agentBuilder.ui.startMessage")}</MessageContent>
      </Message>
      <PromptInput
        onSubmit={({ text }) => {
          if (text.trim() && !loading) onDescribe(text.trim());
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder={t("agentBuilder.ui.startPlaceholder")} maxLength={1000} disabled={loading} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit className="ml-auto" status={loading ? "submitted" : "idle"} disabled={loading} />
        </PromptInputFooter>
      </PromptInput>
      {loading && (
        <Marker>
          <MarkerContent>{t("agentBuilder.ui.suggesting")}</MarkerContent>
        </Marker>
      )}
      <Text size="small" className="text-ui-fg-subtle">{t("agentBuilder.ui.templates")}</Text>
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_TYPES.map((type) => (
          <Button key={type} size="small" variant="secondary" disabled={loading} onClick={() => onTemplate(type)}>
            {t(`agentBuilder.types.${type}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

`components/question-message.tsx`:
```tsx
import {
  confidenceLevel, readAnswer, type AgentProfile, type AgentSuggestion, type Question,
} from "@repo/agent-blueprint";
import { Badge } from "@medusajs/ui";
import {
  Message, MessageContent, Questionnaire, QuestionnaireActions, QuestionnaireChoice,
  QuestionnaireChoices, QuestionnaireDescription, QuestionnaireError, QuestionnaireInput,
  QuestionnaireItem, QuestionnaireNext, QuestionnaireProgress, QuestionnaireSkip, QuestionnaireTitle,
} from "@repo/ui/common-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  question: Question;
  profile: AgentProfile;
  suggestion: AgentSuggestion | null;
  position: { current: number; total: number };
  onAnswer: (value: unknown) => void;
  onSkip: () => void;
};

const BOOLEAN_CHOICES = [
  { value: "yes", labelKey: "agentBuilder.ui.yes" },
  { value: "no", labelKey: "agentBuilder.ui.no" },
];

function toFormValue(question: Question, raw: unknown): string | string[] {
  if (question.kind === "multi") return (raw as string[] | undefined) ?? [];
  if (question.kind === "boolean") return raw ? "yes" : "no";
  return String(raw ?? "");
}

function fromFormValue(question: Question, value: string | string[]): unknown {
  if (question.kind === "boolean") return value === "yes";
  if (question.kind === "text") return (value as string).trim();
  return value;
}

function badgeFor(question: Question, suggestion: AgentSuggestion | null): "auto" | "check" | null {
  if (!suggestion) return null;
  const scored =
    question.id === "businessType" ? suggestion.businessType
    : question.id === "personality" ? suggestion.personality
    : question.id === "formality" ? suggestion.formality
    : null;
  if (scored) {
    const level = confidenceLevel(scored.confidence);
    return level === "none" ? null : level;
  }
  return question.id === "goals" || question.id === "rules" ? "check" : null;
}

export function QuestionMessage({ question, profile, suggestion, position, onAnswer, onSkip }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(() => toFormValue(question, readAnswer(profile, question.path)));
  const badge = badgeFor(question, suggestion);
  const choices = question.kind === "boolean" ? BOOLEAN_CHOICES : (question.choices ?? []);

  return (
    <Message from="assistant" variant="outline" className="w-full">
      <MessageContent className="w-full max-w-full">
        <Questionnaire onSubmit={() => onAnswer(fromFormValue(question, value))}>
          <div className="flex items-center justify-between gap-2">
            <QuestionnaireProgress current={position.current} total={position.total} render={(p) => t("agentBuilder.ui.progress", p)} />
            {badge && (
              <Badge size="2xsmall" color={badge === "auto" ? "green" : "orange"}>
                {t(`agentBuilder.ui.${badge}`)}
              </Badge>
            )}
          </div>
          <QuestionnaireItem
            name={question.id}
            value={value}
            onValueChange={setValue}
            multiple={question.kind === "multi"}
            required={question.required}
            max={question.max}
          >
            <QuestionnaireTitle>{t(question.titleKey)}</QuestionnaireTitle>
            {question.descriptionKey && <QuestionnaireDescription>{t(question.descriptionKey)}</QuestionnaireDescription>}
            {question.kind === "text" ? (
              <QuestionnaireInput
                aria-label={t(question.titleKey)}
                placeholder={question.placeholderKey ? t(question.placeholderKey) : undefined}
                multiline={question.multiline}
                maxLength={question.multiline ? 1000 : 120}
              />
            ) : (
              <QuestionnaireChoices shortcuts="numbers">
                {choices.map((c) => (
                  <QuestionnaireChoice key={c.value} value={c.value} label={t(c.labelKey)} />
                ))}
              </QuestionnaireChoices>
            )}
            <QuestionnaireError>{t("agentBuilder.ui.required")}</QuestionnaireError>
          </QuestionnaireItem>
          <QuestionnaireActions>
            {!question.required && <QuestionnaireSkip onClick={onSkip}>{t("actions.skip")}</QuestionnaireSkip>}
            <QuestionnaireNext>{t("actions.next")}</QuestionnaireNext>
          </QuestionnaireActions>
        </Questionnaire>
      </MessageContent>
    </Message>
  );
}
```

`components/answer-message.tsx`:
```tsx
import { readAnswer, type AgentProfile, type Question } from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { IconPencil } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

export function summarize(question: Question, raw: unknown, t: TFunction): string {
  if (question.kind === "boolean") return t(raw ? "agentBuilder.ui.yes" : "agentBuilder.ui.no");
  if (question.kind === "text") return String(raw ?? "");
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values
    .map((v) => t(question.choices?.find((c) => c.value === v)?.labelKey ?? String(v)))
    .join(", ");
}

export function AnswerMessage({ question, profile, onEdit }: { question: Question; profile: AgentProfile; onEdit: () => void }) {
  const { t } = useTranslation();
  const summary = summarize(question, readAnswer(profile, question.path), t) || t("agentBuilder.ui.skipped");
  return (
    <Message from="user">
      <MessageContent
        render={<button type="button" onClick={onEdit} title={t("agentBuilder.ui.editAnswer")} className="group text-left" />}
      >
        <span className="flex items-center gap-2">
          {summary}
          <IconPencil size={14} className="shrink-0 opacity-50 group-hover:opacity-100" />
        </span>
      </MessageContent>
    </Message>
  );
}
```

`components/builder-thread.tsx`:
```tsx
import { buildQuestionGroups } from "@repo/agent-blueprint";
import { Button } from "@medusajs/ui";
import {
  Marker, MarkerContent, Message, MessageContent, MessageScroller, MessageScrollerButton,
  MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport,
} from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { currentStep, isComplete, steps } from "../builder-state";
import type { AgentBuilderController } from "../use-agent-builder";
import { AnswerMessage } from "./answer-message";
import { QuestionMessage } from "./question-message";
import { StartComposer } from "./start-composer";

export function BuilderThread(builder: AgentBuilderController) {
  const { t } = useTranslation();
  const { state, dispatch } = builder;

  if (!state.profile) {
    return <StartComposer loading={builder.starting} onDescribe={builder.startFromDescription} onTemplate={builder.startFromTemplate} />;
  }

  const profile = state.profile;
  const all = steps(profile);
  const current = currentStep(state);
  const complete = isComplete(state);

  return (
    <MessageScroller className="h-full">
      <MessageScrollerViewport>
        <MessageScrollerContent className="mx-auto flex w-full max-w-[680px] flex-col gap-4 p-4 pb-24 md:p-8">
          {state.source === "describe" && (
            <Message from="assistant">
              <MessageContent>{t(state.suggestion ? "agentBuilder.ui.suggested" : "agentBuilder.ui.suggestFailed")}</MessageContent>
            </Message>
          )}

          {buildQuestionGroups(profile).map((group) => {
            const visible = group.questions.filter(
              (q) => state.answered.includes(q.id) || q.id === current?.question.id,
            );
            if (!visible.length) return null;
            return (
              <div key={group.id} className="flex flex-col gap-4">
                <Marker variant="separator">
                  <MarkerContent>{t(group.titleKey)}</MarkerContent>
                </Marker>
                {visible.map((question) =>
                  question.id === current?.question.id ? (
                    <MessageScrollerItem key={question.id} messageId={question.id} scrollAnchor>
                      <QuestionMessage
                        key={`${question.id}:${state.editing ?? ""}`}
                        question={question}
                        profile={profile}
                        suggestion={state.suggestion}
                        position={{ current: all.findIndex((s) => s.question.id === question.id) + 1, total: all.length }}
                        onAnswer={(value) => dispatch({ type: "answer", question, value })}
                        onSkip={() => dispatch({ type: "skip", question })}
                      />
                    </MessageScrollerItem>
                  ) : (
                    <AnswerMessage
                      key={question.id}
                      question={question}
                      profile={profile}
                      onEdit={() => dispatch({ type: "edit", questionId: question.id })}
                    />
                  ),
                )}
                {group.id === "rules" && state.chatbotId && state.source !== "hydrate" && (
                  <Message from="assistant">
                    <MessageContent>{t("agentBuilder.ui.draftCreated")}</MessageContent>
                  </Message>
                )}
              </div>
            );
          })}

          {builder.saveError && (
            <Marker className="text-ui-fg-error">
              <MarkerContent>{t("agentBuilder.ui.saveFailed")}</MarkerContent>
            </Marker>
          )}

          {complete && !state.finished && (
            <Message from="assistant">
              <MessageContent className="flex flex-col items-start gap-3">
                {t("agentBuilder.ui.done")}
                <Button size="small" onClick={builder.finish} isLoading={builder.finishing} disabled={!state.chatbotId}>
                  {t("agentBuilder.ui.finish")}
                </Button>
              </MessageContent>
            </Message>
          )}
          {state.finished && (
            <Message from="assistant">
              <MessageContent>{t("agentBuilder.ui.finished")}</MessageContent>
            </Message>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}
```

`components/test-panel.tsx`:
```tsx
import { AIChatCard } from "@/components/ai-chat/ai-chat-card";
import { AIChatInput } from "@/components/ai-chat/ai-chat-input";
import { workspaceChatTransport } from "@/components/ai-chat/use-ai-chat-stream";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAuthToken } from "@/modules/auth";
import { compilePrompt, type AgentProfile } from "@repo/agent-blueprint";
import { Tabs, Text } from "@medusajs/ui";
import { MessageResponse } from "@repo/ui/common-components";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Props = { chatbotId: string | null; profile: AgentProfile | null; extraInstructions: string };

export function TestPanel({ chatbotId, profile, extraInstructions }: Props) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const token = useAuthToken();
  const transport = useMemo(() => workspaceChatTransport(workspaceSlug, chatbotId ?? ""), [workspaceSlug, chatbotId]);
  const prompt = useMemo(() => (profile ? compilePrompt(profile, { extraInstructions }) : ""), [profile, extraInstructions]);

  return (
    <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-3">
      <Tabs.List>
        <Tabs.Trigger value="chat">{t("agentBuilder.ui.chatTab")}</Tabs.Trigger>
        <Tabs.Trigger value="prompt">{t("agentBuilder.ui.promptTab")}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="chat" className="min-h-0 flex-1">
        {chatbotId ? (
          <AIChatCard
            key={chatbotId}
            heading={t("agentBuilder.ui.tryAgent")}
            chatbotId={chatbotId}
            transport={transport}
            canSubmit={!!token}
            renderInput={<AIChatInput />}
            className="h-full"
          />
        ) : (
          <Text size="small" className="text-ui-fg-muted p-4 text-center">{t("agentBuilder.ui.testLocked")}</Text>
        )}
      </Tabs.Content>
      <Tabs.Content value="prompt" className="min-h-0 flex-1 overflow-y-auto">
        <MessageResponse>{prompt}</MessageResponse>
      </Tabs.Content>
    </Tabs>
  );
}
```

`agent-builder.tsx`:
```tsx
import { RouteFocusModal } from "@/components/modals";
import { useChatbot } from "@/hooks/api";
import { Button, IconButton, Text, clx } from "@medusajs/ui";
import { XMark } from "@medusajs/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { BuilderThread } from "./components/builder-thread";
import { TestPanel } from "./components/test-panel";
import { useAgentBuilder } from "./use-agent-builder";

export function AgentBuilder() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const hydrateId = params.get("chatbotId") ?? "";
  const { chatbot } = useChatbot(hydrateId, { enabled: !!hydrateId });
  const builder = useAgentBuilder({ hydrateFrom: hydrateId ? chatbot : undefined });
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <RouteFocusModal.Header>
        <Text size="small" className="text-ui-fg-subtle">{t("agentBuilder.ui.title")}</Text>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="grid grid-cols-1 overflow-hidden md:grid-cols-[1fr_420px]">
        <div className="min-h-0 overflow-hidden">
          <BuilderThread {...builder} />
        </div>
        <aside
          className={clx(
            "bg-ui-bg-subtle fixed inset-0 z-40 flex-col gap-2 p-4 md:static md:z-auto md:flex md:border-l md:border-ui-border-base",
            panelOpen ? "flex" : "hidden",
          )}
        >
          <div className="flex justify-end md:hidden">
            <IconButton variant="transparent" onClick={() => setPanelOpen(false)}>
              <XMark />
              <span className="sr-only">{t("actions.close")}</span>
            </IconButton>
          </div>
          <TestPanel chatbotId={builder.state.chatbotId} profile={builder.state.profile} extraInstructions={builder.extraInstructions} />
        </aside>
        {builder.state.profile && (
          <Button className="fixed bottom-4 right-4 z-30 md:hidden" onClick={() => setPanelOpen(true)}>
            {t("agentBuilder.ui.tryAgent")}
          </Button>
        )}
      </RouteFocusModal.Body>
    </>
  );
}
```

Replace `apps/app/src/routes/chatbot/chatbot-create/chatbot-create.tsx` with:
```tsx
import { RouteFocusModal } from "@/components/modals";
import { AgentBuilder } from "./agent-builder/agent-builder";

export function ChatbotCreate() {
  return (
    <RouteFocusModal>
      <AgentBuilder />
    </RouteFocusModal>
  );
}
```
Delete the old create form: `rm -r apps/app/src/routes/chatbot/chatbot-create/components`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter app test agent-builder`
Expected: PASS (5 tests in `agent-builder.test.tsx` plus the earlier builder tests).

If `PromptInput` fails to render under jsdom (e.g. a missing browser API), add the missing stub to `apps/app/test/setup.ts`, following the `ResizeObserver` stub in `packages/ui/test/setup.ts`. Don't mock `StartComposer` away: the describe path is under test.

- [ ] **Step 7: Type-check and lint**

Run: `cd apps/app && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "agent-builder|chatbot-create" ; cd ../.. && pnpm --filter app lint`
Expected: no type errors in the new files, and lint passes. The app has pre-existing type errors elsewhere; only new files must be clean.

- [ ] **Step 8: Commit**

```bash
git add apps/app/src
git commit -m "feat(app): conversational agent builder replaces the create form"
```

---

### Task 12: Extra instructions replace the General knowledge editor

**Files:**
- Modify: `apps/app/src/routes/chatbot/schemas.ts`
- Modify: `apps/app/src/routes/chatbot/constants.ts` (`CHATBOT_FORM_DEFAULTS`)
- Modify: `apps/app/src/routes/chatbot/components/chatbot-form/chatbot-form.tsx`
- Modify: `apps/app/src/routes/chatbot/chatbot-edit/components/chatbot-edit-form/chatbot-edit-form.tsx`
- Modify: `apps/app/src/routes/chatbot/chatbot-details/components/chatbot-general-knowledge/chatbot-general-knowledge.tsx`
- Test: `apps/app/src/routes/chatbot/components/chatbot-form/chatbot-form.test.tsx`

**Interfaces:**
- Consumes: `agentProfile` and `extraInstructions` on `ChatbotGetDetailResponseDto` (from Task 8 Step 7).
- Produces:
  - `ChatbotForm` props lose `generalKnowledgeLabel` and `generalKnowledgePlaceholder`, and gain `builderHref?: string`.
  - `ChatbotFormData.extraInstructions: string` replaces `generalKnowledge`.

- [ ] **Step 1: Write the failing test**

Add these cases to `chatbot-form.test.tsx`, inside its top-level `describe`, reusing the file's existing render helper and mocks. If the file renders `ChatbotForm` directly, pass the same props it already passes, minus `generalKnowledgeLabel` and `generalKnowledgePlaceholder`:
```tsx
  it("shows Extra instructions instead of a General knowledge editor", () => {
    renderForm();
    expect(screen.getByLabelText("agentBuilder.ui.extraInstructions")).toBeInTheDocument();
    expect(screen.queryByText("chatbot.edit.generalKnowledge")).not.toBeInTheDocument();
  });

  it("links to the builder when a builder link is given", () => {
    renderForm({ builderHref: "/ws/chatbot/create?chatbotId=c1" });
    expect(screen.getByRole("link", { name: "agentBuilder.ui.editWithBuilder" })).toHaveAttribute("href", "/ws/chatbot/create?chatbotId=c1");
  });
```
If the file has no `renderForm` helper, add one at the top of the `describe`:
```tsx
  const renderForm = (extra: Partial<React.ComponentProps<typeof ChatbotForm>> = {}) =>
    render(
      <MemoryRouter>
        <ChatbotForm
          defaultValues={CHATBOT_FORM_DEFAULTS}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          title="t" submitText="s" cancelText="c" nameLabel="n" typeLabel="ty"
          {...extra}
        />
      </MemoryRouter>,
    );
```
(Import `MemoryRouter` from `react-router-dom` if missing. Keep the file's existing `RouteFocusModal` handling: if other tests in the file wrap `ChatbotForm` in a provider, wrap it the same way here.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter app test chatbot-form`
Expected: FAIL with "Unable to find a label with the text of: agentBuilder.ui.extraInstructions".

- [ ] **Step 3: Implement**

`schemas.ts`: replace `generalKnowledge: z.string().max(10000).default(""),` with `extraInstructions: z.string().max(5000).default(""),`.

`constants.ts`: in `CHATBOT_FORM_DEFAULTS`, replace `generalKnowledge: "",` with `extraInstructions: "",`.

`chatbot-form.tsx`:
- Remove the `generalKnowledgeLabel` and `generalKnowledgePlaceholder` props (from the type and the destructuring).
- Add `builderHref?: string`.
- Remove the `TipTapEditor` import if it is no longer used.
- Add `Link` from `react-router-dom`.
- Replace the whole `<Form.Field name="generalKnowledge" …/>` block with:
```tsx
              <Form.Field
                name="extraInstructions"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <div className="flex items-center justify-between gap-2">
                      <Form.Label optional>{t("agentBuilder.ui.extraInstructions")}</Form.Label>
                      {builderHref && (
                        <Link to={builderHref} className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover">
                          {t("agentBuilder.ui.editWithBuilder")}
                        </Link>
                      )}
                    </div>
                    <Form.Hint>{t("agentBuilder.ui.extraInstructionsHint")}</Form.Hint>
                    <Form.Control>
                      <Textarea {...field} rows={5} maxLength={5000} className="w-full" />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
```
(`Textarea` is already imported from `@medusajs/ui` in this file.)

`chatbot-edit-form.tsx`:
- In the `useEffect` that builds `defaultValues`, prefill Extra instructions so a legacy prompt is never lost:
```tsx
    setDefaultValues({
      ...rest,
      extraInstructions: chatbot.extraInstructions ?? (chatbot.agentProfile ? "" : chatbot.generalKnowledge ?? ""),
      accounts: accounts.map((account: AccountListResponseDto) => account.id),
    });
```
- In `handleSubmit`, replace `generalKnowledge: data.generalKnowledge || "",` with:
```tsx
        extraInstructions: data.extraInstructions ?? "",
        agentProfile: chatbot?.agentProfile ?? undefined,
```
- Remove the `generalKnowledgeLabel` and `generalKnowledgePlaceholder` props from `<ChatbotForm>`, and pass `builderHref={chatbot?.agentProfile ? \`/${workspaceSlug}/chatbot/create?chatbotId=${id}\` : undefined}`. Get `workspaceSlug` from `useWorkspaceParams()` if the file doesn't have it yet.

`chatbot-general-knowledge.tsx` (the inline editor on the details page):
- `draft` starts from `item.extraInstructions ?? (item.agentProfile ? "" : item.generalKnowledge ?? "")`, and `handleCancel` resets to the same expression.
- In `handleSave`, replace `generalKnowledge: draft,` with `extraInstructions: draft, agentProfile: item.agentProfile ?? undefined,`.
- Change the heading and the editor placeholder keys to `agentBuilder.ui.extraInstructions` and `agentBuilder.ui.extraInstructionsHint`.
- Leave the read-only view showing `item.generalKnowledge`, so owners can still see the compiled prompt.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter app test chatbot`
Expected: PASS, including the existing `chatbot-form.test.tsx` cases.

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/routes/chatbot
git commit -m "feat(app): extra instructions replace the free-text prompt editor"
```

---

### Task 13: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Run every test suite touched by this plan**

Run:
```bash
pnpm --filter @repo/agent-blueprint test
pnpm --filter @repo/ui test
pnpm --filter api test -- chatbot agent-builder
pnpm --filter app test
```
Expected: all PASS. Record any failure with its output. Don't mark this step done while anything fails.

- [ ] **Step 2: Start the stack**

```bash
docker start ecbot-database-1 ecbot-redis-1 ecbot-jwks-server-1 ecbot-cloud-tasks-emulator-1
pnpm turbo run dev --filter='!edge'
```
Expected: the app is on :5173, the API on :8080 and AI on :8000. The API log shows "Nest application successfully started", and `packages/agent-blueprint/dist/index.js` exists (it was built by `api#dev`'s dependency).

- [ ] **Step 3: Build a spa agent from one sentence (desktop, 1440px)**

In the app, go to Chatbot → Create. Type "Mình có tiệm nail ở Đà Nẵng, khách hay hỏi giá và muốn đặt lịch" and send. Check:
- The business type shows beauty with the "Auto-filled" badge. (If `TYPESAFE_API_KEY` is unset, you instead get the "could not work that out" message and plain questions.)
- Each group starts with a divider carrying its name.
- Answered questions show as user bubbles, and clicking one reopens it.
- After the Rules group, the draft message appears and the Chat tab unlocks.
- Ask the test chat "Giá sơn gel bao nhiêu?". It answers from the Services and prices fact, or says it will check. It never invents a price.
- The "What it is told" tab shows the structured sections, with no "—".

- [ ] **Step 4: Check the stored prompt**

Run:
```bash
docker exec ecbot-database-1 psql -U postgres -d postgres -c "select name, status, left(general_knowledge, 400), agent_profile->>'businessType' from chatbots order by created_at desc limit 1;"
```
(Adjust `-U`/`-d` to the values in `apps/api/.env` `DATABASE_URL`.)
Expected: `general_knowledge` starts with `# <agent> · <business>` followed by the divider and `## Requirements`, `status` is `inactive` until you click "Activate agent", and `agent_profile->>'businessType'` is `beauty`.

- [ ] **Step 5: Mobile and language checks**

- **375px:** resize the browser to 375×812. The builder fills the width, and "Try your agent" opens the test panel full screen with a close button.
- **Language:** switch the app language between vi and en. No `agentBuilder.` keys show raw, and the address-style question only appears for a vi agent.

- [ ] **Step 6: Legacy bot safety**

Open an existing chatbot made before this change and go to Edit. Extra instructions is prefilled with its old prompt. Save without changes, then run the Step 4 query for that bot: `general_knowledge` is unchanged.

- [ ] **Step 7: Lint**

Run: `pnpm lint`
Expected: no new errors in the files this plan touched.
