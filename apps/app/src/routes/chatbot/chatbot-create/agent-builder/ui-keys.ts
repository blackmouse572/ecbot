export const BUILDER_UI_KEYS = [
  "title", "startMessage", "startPlaceholder", "templates", "suggesting", "suggestFailed",
  "suggested", "auto", "check", "required", "skipped", "yes", "no",
  "draftCreated", "saveFailed", "done", "finish", "finished", "tryAgent", "chatTab",
  "promptTab", "testLocked", "progress", "extraInstructions", "extraInstructionsHint",
  "editWithBuilder", "templateAnswer",
].map((k) => `agentBuilder.ui.${k}`);
