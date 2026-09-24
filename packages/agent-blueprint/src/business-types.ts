export const BUSINESS_TYPES = [
  { id: "restaurant", promptLabel: "restaurant or cafe", mode: "simple", personal: false },
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
