/** A workspace page that explains itself with art and a "How it works" note. */
export type GuideFeature =
  "chatbot" | "accounts" | "conversations" | "knowledge" | "tools" | "skills";

/** A one-time moment, stored per workspace in the viewer's browser. */
export type GuideMoment = "tour" | "firstConversation";
