import { getBusinessType } from "./business-types";
import {
  ADDRESS_STYLE, AFTER_HOURS, COLLECT, FACTS, FORMALITY, GOALS, HANDOFF_WHEN, HOURS_NOT_PROVIDED,
  NO_FACTS_PROVIDED, PERSONALITY, REPLY_LENGTH, RULES, UNSURE, promptOf, type FactId,
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

function list(items: string[], conjunction = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

// An item like "date and time" would blur where items split, so such lists
// use semicolons.
function unambiguousList(items: string[]): string {
  if (items.length <= 1 || !items.some((item) => item.includes(" and "))) return list(items);
  return `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`;
}

// Numbers the kept lines 1..n so an omitted step never leaves a gap.
function numbered(lines: string[]): string[] {
  return lines.filter(Boolean).map((line, i) => `${i + 1}. ${line}`);
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
    profile.goals.length ? "- Your jobs:" : "",
    ...profile.goals.map((g, i) => `  ${i + 1}. ${promptOf(GOALS, g)}`),
  ]);

  // "First conversation" read as every turn to models, which re-introduced
  // themselves each reply and skipped what the customer said (#173). Keyed on
  // the chat history, not "your first reply": a model would otherwise treat
  // turn 2 as its first when a staff or fallback reply answered turn 1.
  const initialization = section("Initialization", [
    profile.greeting.trim()
      ? `If the chat history has no reply from you yet, open with: "${plain(profile.greeting)}", then respond to what the customer said.`
      : `If the chat history has no reply from you yet, introduce yourself as ${agent} from ${business} in one short sentence, then respond to what the customer said (if they only said hello, ask how you can help).`,
    "If the chat history already contains a reply from you, do not greet or introduce yourself.",
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
    : [NO_FACTS_PROVIDED]);

  const process = type.personal ? "" : section("Process", numbered([
    "Understand what the customer needs. Ask at most one question at a time.",
    profile.collect.length ? `Before confirming anything, collect: ${unambiguousList(profile.collect.map((c) => promptOf(COLLECT, c)))}.` : "",
    "Read the key details back and wait for a clear yes before you confirm, and before you call any tool that creates, changes or cancels an order, booking or payment.",
    profile.handoffWhen.length ? `Hand the conversation to a person when ${list(profile.handoffWhen.map((h) => promptOf(HANDOFF_WHEN, h)), "or")}.` : "",
    type.mode === "detailed" ? "Explain step by step and check that the customer understood before moving on." : "",
  ]));

  const rules = section("Rules", [
    ...profile.rules.map((r, i) => `${i + 1}. ${promptOf(RULES, r)}`),
    `${profile.rules.length + 1}. When you are not sure: ${promptOf(UNSURE, profile.unsure)}`,
  ]);

  const hoursKnown = allowedFacts.includes("opening_hours") && !!profile.facts.opening_hours?.trim();
  const afterHours = profile.afterHours === "share_hours" && !hoursKnown
    ? HOURS_NOT_PROVIDED
    : promptOf(AFTER_HOURS, profile.afterHours);
  const interaction = section("Interaction protocol", [
    `- ${promptOf(REPLY_LENGTH, profile.replyLength)}`,
    `- ${profile.emoji ? "Use an emoji now and then when it fits the mood." : "Do not use emoji."}`,
    profile.primaryLanguage === "vi" && profile.addressStyle ? `- ${promptOf(ADDRESS_STYLE, profile.addressStyle)}` : "",
    `- ${profile.followUpQuestions ? "End with a short question that helps the conversation move forward." : "Do not add follow-up questions unless you need information."}`,
    type.personal ? "" : `- Outside opening hours: ${afterHours}`,
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
