export const BUILDER_UI_KEYS = [
  "title", "startMessage", "startPlaceholder", "templates", "suggesting", "suggestFailed",
  "suggested", "auto", "check", "required", "skipped", "yes", "no",
  "draftCreated", "saveFailed", "done", "finish", "finished", "tryAgent",
  "promptTab", "testLocked", "progress", "extraInstructions", "extraInstructionsHint",
  "editWithBuilder", "templateAnswer", "heroTitle", "heroSubtitle", "factLead",
].map((k) => `agentBuilder.ui.${k}`);
