import type { RoleFormData } from "./schemas";

export const ROLE_FORM_DEFAULTS: RoleFormData = {
  name: "",
  description: "",
  permissions: [],
};

// Subjects a custom workspace role can hold — mirrors the API's
// ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT.
export const ROLE_SUBJECTS = [
  { value: "CHATBOT", labelKey: "roles.subjects.chatbot" },
  { value: "RAG", labelKey: "roles.subjects.rag" },
  { value: "KNOWLEDGE_BASE", labelKey: "roles.subjects.knowledgeBase" },
  { value: "CUSTOMER", labelKey: "roles.subjects.customer" },
] as const;

export const ROLE_ACTIONS = [
  { value: "manage", label: "Manage" },
  { value: "read", label: "Read" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
] as const;
