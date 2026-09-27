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
  { id: "em_anhchi", prompt: "Refer to yourself as \"em\" and address them as \"anh\" or \"chị\"." },
  { id: "minh_ban", prompt: "Refer to yourself as \"mình\" and address them as \"bạn\"." },
  { id: "shop_ban", prompt: "Refer to yourself as \"shop\" and address them as \"bạn\"." },
  { id: "toi_quykhach", prompt: "Refer to yourself as \"tôi\" and address them as \"quý khách\"." },
] as const satisfies readonly Entry[];

export const AFTER_HOURS = [
  { id: "reply_normally", prompt: "Reply as usual." },
  { id: "share_hours", prompt: "Reply as usual and mention the opening hours." },
  { id: "promise_callback", prompt: "Take the request and promise that the team will get back during opening hours." },
] as const satisfies readonly Entry[];

// Which channels to connect in the builder. Not compiled into the prompt: the
// agent answers the same way on every channel.
export const CHANNELS = [
  { id: "messenger" },
  { id: "instagram" },
  { id: "zalo" },
  { id: "tiktok" },
  { id: "shopee" },
  { id: "website" },
  { id: "telegram" },
] as const;

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

type IdOf<T extends readonly { readonly id: string }[]> = T[number]["id"];
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

export const idsOf = <T extends readonly { readonly id: string }[]>(list: T) =>
  list.map((x) => x.id) as [IdOf<T>, ...IdOf<T>[]];

export function promptOf(list: readonly Entry[], id: string): string {
  return list.find((x) => x.id === id)?.prompt ?? id;
}

export const PERSONAL_GOALS: GoalId[] = ["manage_schedule", "triage_email", "track_tasks", "research", "log_contacts", "capture_leads"];
