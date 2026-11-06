import type { RoleFormData } from "./schemas";

export const ROLE_FORM_DEFAULTS: RoleFormData = {
  name: "",
  description: "",
  permissions: [],
};

// Areas a custom workspace role can be given. Each one is enforced by the
// API (the subject sits in ALLOWED_WORKSPACE_POLICY_SUBJECT and guards routes).
export const ROLE_SUBJECTS = [
  { value: "CHATBOT", labelKey: "roles.subjects.chatbot" },
  { value: "KNOWLEDGE_BASE", labelKey: "roles.subjects.knowledgeBase" },
  { value: "RAG", labelKey: "roles.subjects.rag" },
  { value: "SKILL", labelKey: "roles.subjects.skill" },
  { value: "TOOL", labelKey: "roles.subjects.tool" },
  { value: "CUSTOMER", labelKey: "roles.subjects.customer" },
  { value: "CUSTOMER_DATA", labelKey: "roles.subjects.customerData" },
  { value: "MEMBER", labelKey: "roles.subjects.member" },
  { value: "CLIENT_CREDENTIAL", labelKey: "roles.subjects.clientCredential" },
] as const;

// What each access level grants on an area.
export const ROLE_ACCESS_LEVELS = [
  { value: "none", labelKey: "roles.access.none", action: [] },
  { value: "view", labelKey: "roles.access.view", action: ["read"] },
  { value: "full", labelKey: "roles.access.full", action: ["manage"] },
] as const;
