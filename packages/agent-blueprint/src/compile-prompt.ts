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

export function withArticle(text: string): string {
  return `${/^[aeiou]/i.test(text) ? "an" : "a"} ${text}`;
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
      : `- Business: ${business}, ${withArticle(type.promptLabel)}.`,
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
