type Translate = (key: string, options?: Record<string, unknown>) => string;

type SenderFields = {
  senderId: string;
  senderName?: string | null;
  account?: { type?: string } | null;
};

/**
 * Who the inbox shows for a conversation. A website visitor is anonymous, so
 * their id is a UUID their browser made up; showing it reads as a bug (#257).
 * They get "Website visitor #2559" until the customer has a name.
 */
export const senderLabel = (conversation: SenderFields, t: Translate) => {
  if (conversation.senderName) return conversation.senderName;
  if (conversation.account?.type === "WEBSITE_WIDGET") {
    return t("widget.visitorName", {
      suffix: conversation.senderId.slice(0, 4).toUpperCase(),
    });
  }
  return conversation.senderId;
};
