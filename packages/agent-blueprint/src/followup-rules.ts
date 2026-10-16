import { getBusinessType, type BusinessTypeId } from "./business-types";
import { migrateProfile } from "./migrate-profile";
import type { AgentProfile } from "./profile";
import { PRESETS } from "./presets";

// The builder prefills the chatbot's follow-up rules with these, so an agent
// knows when to check in without the owner writing anything. Which rules
// apply comes from the goals the owner picked; their wording and timing from
// the business type. Each rule names the schedule_followup call: live runs
// skipped vaguer wording ("check in later"), above all in Vietnamese. The
// 24-hour limit keeps unasked messages inside Messenger and Instagram's
// reply window.
const INTRO = "Check-ins to schedule yourself: call schedule_followup in the same reply, in any language, without asking the customer first.";
const LIMITS = "Limits: only between 09:00 and 20:00, within 24 hours of the customer's last message, at most one per topic, and none once the customer says no or does not want messages.";

// What a booking is called, for the types whose preset books something.
const BOOKING_NAMES: Partial<Record<BusinessTypeId, string>> = {
  restaurant: "table reservation",
  beauty: "appointment",
  healthcare: "appointment",
  hotel: "room booking",
  fitness: "class or session",
  automotive: "test drive or service appointment",
  home_services: "service visit",
  studio_events: "shoot or event booking",
  education: "class or level test",
  real_estate: "property viewing",
};

// Bigger decisions: an undecided customer gets a day, not a few hours.
const CONSIDERED: readonly BusinessTypeId[] = ["real_estate", "finance", "education", "travel", "automotive", "studio_events", "hotel"];

/**
 * The follow-up rules to save with a changed profile: they follow the
 * profile until the owner edits them, and edited rules are kept.
 */
export function nextFollowupRules(current: string | null | undefined, previous: AgentProfile | null | undefined, profile: AgentProfile): string {
  const kept = current?.trim();
  const previousDefault = previous ? compileFollowupRules(migrateProfile(previous)) : undefined;
  return kept && kept !== previousDefault ? current! : compileFollowupRules(profile);
}

/** Default follow-up rules for a business agent; empty when no goal needs a check-in. */
export function compileFollowupRules(profile: AgentProfile): string {
  const type = profile.businessType;
  if (getBusinessType(type).personal) return "";
  const has = (...goals: AgentProfile["goals"]) => goals.some((g) => profile.goals.includes(g));
  const books = has("book_appointments", "reservations");
  const deposit = PRESETS[type].facts.includes("deposit_policy");
  const booking = BOOKING_NAMES[type] ?? "booking";
  const rules: string[] = [];

  if (has("take_orders") || (books && deposit)) {
    const what = deposit ? "payment or deposit" : "payment";
    rules.push(`Payment: whenever the customer has the ${what} details but has not confirmed paying (for example they say they will pay later), also call schedule_followup with \`delay_minutes\` 30 to check on the ${what}.`);
  }
  if (books) {
    rules.push(`Booking (${booking}): whenever you call apply_customer_tag with the new-booking tag and the booked time is less than a day away, call schedule_followup in that same step with \`at\` set to 2 hours before the booked time, to remind the customer.`);
  }
  if (has("recommend", "capture_leads", "qualify_leads")) {
    const [minutes, when] = CONSIDERED.includes(type) ? [1200, "the next day"] : [180, "a few hours later"];
    rules.push(`Undecided: whenever an interested customer puts off deciding (they want to think it over, ask someone first, compare, or decide later), also call schedule_followup with \`delay_minutes\` ${minutes} to check in once ${when}.`);
  }
  return rules.length ? [INTRO, ...rules.map((r) => `- ${r}`), LIMITS].join("\n") : "";
}
