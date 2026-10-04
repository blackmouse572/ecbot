import type { FactId } from "./libraries";
import { PRESETS } from "./presets";
import { PROFILE_LIMITS, type AgentProfile } from "./profile";

// "called Kunmart", "named ...", "tên là ...", "có tên ...", "tên shop là ..."
const NAME_INTRO =
  /(?:\bcalled|\bnamed|có tên(?:\s+là)?|tên(?:\s+(?:shop|cửa hàng|quán|tiệm|công ty|thương hiệu))?\s+là)\s+["“']?/iu;
// A name is the run of capitalised words (or numbers, "&") after the intro.
const NAME_WORD = /^(?:\p{Lu}[\p{L}\p{N}'’.-]*|\p{N}+|&)$/u;
const MAX_NAME_WORDS = 5;

const RETURNS =
  /\b(?:returns?|refunds?|exchanges?)\b|đổi trả|đổi hàng|trả hàng|hoàn tiền/iu;

function extractName(text: string): string {
  const intro = NAME_INTRO.exec(text);
  if (!intro) return "";
  const words: string[] = [];
  for (const raw of text.slice(intro.index + intro[0].length).split(/\s+/)) {
    const word = raw.replace(/["”',;:!?]+$|\.$/u, "");
    if (!NAME_WORD.test(word) || words.length === MAX_NAME_WORDS) break;
    words.push(word);
    if (word !== raw) break; // punctuation ended the name
  }
  return words.join(" ").slice(0, PROFILE_LIMITS.shortText);
}

function extractReturnPolicy(text: string): string {
  const part = text
    .split(/[.!?;,\n]/)
    .map((s) => s.trim())
    .find((s) => RETURNS.test(s));
  return (part ?? "").slice(0, PROFILE_LIMITS.longText);
}

/**
 * Fills answers the owner already gave in free text (the opening description,
 * "what makes you different") into the questions that ask for them, so the
 * builder does not ask twice. Only empty answers are filled.
 */
export function prefillFromText(profile: AgentProfile, text: string): AgentProfile {
  let next = profile;
  if (!next.businessName.trim()) {
    const name = extractName(text);
    if (name) next = { ...next, businessName: name };
  }
  const asksReturns = (PRESETS[next.businessType].facts as readonly FactId[]).includes("return_policy");
  if (asksReturns && !next.facts.return_policy?.trim()) {
    const policy = extractReturnPolicy(text);
    if (policy) next = { ...next, facts: { ...next.facts, return_policy: policy } };
  }
  return next;
}
