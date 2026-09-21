// ─── Zalo OA webhook payload ──────────────────────────────────────────────────
// Docs: https://developers.zalo.me/docs/official-account/webhook

export interface ZaloWebhookPayload {
    app_id?: string;
    oa_id?: string;
    user_id_by_app?: string;
    event_name?: string;
    timestamp?: string;
    sender?: { id: string };
    recipient?: { id: string };
    message?: ZaloWebhookMessage;
    // NOTE (reaction shape UNCONFIRMED): no captured payload or Zalo doc
    // excerpt exists anywhere in this repo for the "user reacts to message"
    // webhook. Field names below (`icon`/`type`/`r_msg_id`) are a best-effort
    // guess from Zalo OA's public docs description of the event, not a
    // verified fixture — confirm against a real payload before relying on
    // this in production, and add a fixture under zalo-adapter.spec.ts once
    // one is captured.
    reaction?: ZaloWebhookReaction;
}

export interface ZaloWebhookReaction {
    icon?: string; // emoji/icon of the reaction, when present
    type?: string | number; // alternate/legacy field some payloads may use instead of `icon`
    r_msg_id?: string; // id of the message being reacted to
}

export interface ZaloWebhookMessage {
    msg_id?: string;
    text?: string;
    attachments?: ZaloWebhookAttachment[];
}

export interface ZaloWebhookAttachment {
    type?: string; // image | file | sticker | gif | audio | video | location | link
    payload?: {
        url?: string;
        id?: string;
        thumbnail?: string;
        coordinates?: { latitude?: number; longitude?: number };
    };
}

// ─── Zalo OA REST responses ───────────────────────────────────────────────────

export interface ZaloApiResponse<T> {
    error: number;
    message?: string;
    data?: T;
}

export interface ZaloSendMessageData {
    message_id?: string;
    user_id?: string;
}

export interface ZaloUserProfileData {
    user_id?: string;
    display_name?: string;
    avatar?: string;
}

export interface ZaloOaInfoData {
    oa_id?: string;
    name?: string;
    avatar?: string;
    oa_alias?: string;
}
