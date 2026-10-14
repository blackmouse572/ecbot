import { getBusinessType } from "./business-types";
import type { GoalId } from "./libraries";
import type { AgentProfile } from "./profile";

// The builder prefills the chatbot's follow-up rules with these, so an agent
// knows when to check in without the owner writing anything. Each rule names
// the schedule_followup call: live runs skipped vaguer wording ("check in
// later"), above all in Vietnamese. The 24-hour limit keeps unasked messages
// inside Messenger and Instagram's reply window.
const INTRO = "Check-ins to schedule yourself: call schedule_followup in the same reply, in any language, without asking the customer first.";
const LIMITS = "Limits: only between 09:00 and 20:00, within 24 hours of the customer's last message, at most one per topic, and none once the customer says no or does not want messages.";

const BY_GOAL: { goals: readonly GoalId[]; rule: string }[] = [
  { goals: ["take_orders"], rule: "Payment: whenever the customer has the payment details but has not confirmed paying (for example they say they will pay later), also call schedule_followup with `delay_minutes` 30 to check on the payment." },
  { goals: ["book_appointments", "reservations"], rule: "Booking: whenever you apply the new-booking tag for a time less than a day away, also call schedule_followup with `at` set to 2 hours before the booked time, to remind the customer." },
  { goals: ["recommend", "capture_leads", "qualify_leads"], rule: "Undecided: whenever an interested customer says they want to think it over or will decide later, also call schedule_followup with `delay_minutes` 180 to check in once." },
];

/** Default follow-up rules for a business agent's goals; empty when none needs a check-in. */
export function compileFollowupRules(profile: AgentProfile): string {
  if (getBusinessType(profile.businessType).personal) return "";
  const rules = BY_GOAL.filter(({ goals }) => goals.some((g) => profile.goals.includes(g))).map(({ rule }) => `- ${rule}`);
  return rules.length ? [INTRO, ...rules, LIMITS].join("\n") : "";
}
