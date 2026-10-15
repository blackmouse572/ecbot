export const BUILDER_UI_KEYS = [
  "title", "startPlaceholder", "suggesting", "suggestFailed",
  "suggested", "auto", "check", "required", "skipped", "yes", "no",
  "draftCreated", "saveFailed", "done", "finish", "finished", "tryAgent",
  "promptTab", "promptSummaryIntro", "showFullPrompt", "hideFullPrompt", "progress", "testEarlyHint", "extraInstructions", "extraInstructionsHint",
  "editWithBuilder", "templateAnswer", "heroTitle", "heroSubtitle", "factLead", "yourAgent",
  "existingChannels", "useChannel", "connectLater", "comingSoon", "connectFailed",
  "connected", "telegramTokenLabel", "widgetOriginsLabel", "channelInUse", "unlinkChannel", "removeChannel",
  "activateAsk", "activateNow", "activateLater", "changeTypeTitle", "changeTypeDescription", "changeTypeConfirm",
  "hoursOpen", "hoursClosed", "hoursAddRange", "hoursRemoveRange", "hoursCopyToAll", "hoursFrom", "hoursTo",
  "hoursInvalid", "hoursEveryDay",
  "customCollectLabel", "customCollectPlaceholder", "customCollectAdd", "customCollectRemove", "customCollectLimit", "customCollectOther",
  "customAddressSelf", "customAddressSelfPlaceholder", "customAddressCustomer", "customAddressCustomerPlaceholder", "customAddressMissing",
].map((k) => `agentBuilder.ui.${k}`);
