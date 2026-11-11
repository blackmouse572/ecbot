export interface MessengerSender {
    id: string;
}

export interface MessengerRecipient {
    id: string;
}

export interface MessengerAttachmentPayload {
    sticker_id?: number;
    url?: string;
}

export interface MessengerAttachment {
    payload?: MessengerAttachmentPayload;
    /** Messenger: image | video | audio | file | location | fallback.
     *  Instagram adds share, ig_reel, reel, ig_post, story_mention and
     *  like_heart. */
    type: string;
}

/** What a message answers: a quoted message, or (Instagram) a story. */
export interface MessengerReplyTo {
    mid?: string;
    story?: { id?: string; url?: string };
}

/** Sent when a chat opens from an m.me / ig.me link with `ref`, or a Meta ad. */
export interface MessengerReferral {
    ad_id?: string;
    ref?: string;
    /** SHORTLINK (m.me), SHORTLINKS (ig.me), ADS, MESSENGER_CODE, ... */
    source?: string;
    type?: string;
}

export interface MessengerMessagePayload {
    /** Echoes only: set when an app sent the message via the Send API. */
    app_id?: number;
    attachments?: MessengerAttachment[];
    is_echo?: boolean;
    mid: string;
    quick_reply?: { payload: string };
    referral?: MessengerReferral;
    reply_to?: MessengerReplyTo;
    text?: string;
}

export interface MessengerPostback {
    mid?: string;
    payload: string;
    referral?: MessengerReferral;
    title: string;
}

export interface MessengerReaction {
    action: 'react' | 'unreact';
    emoji: string;
    mid: string;
    reaction: string;
}

export interface MessengerMessagingEvent {
    delivery?: { mids?: string[]; watermark: number };
    message?: MessengerMessagePayload;
    postback?: MessengerPostback;
    reaction?: MessengerReaction;
    read?: { watermark: number };
    /** messaging_referrals: the customer reopened a chat they already had. */
    referral?: MessengerReferral;
    recipient: MessengerRecipient;
    sender: MessengerSender;
    timestamp: number;
}

export interface MessengerWebhookEntry {
    id: string;
    messaging: MessengerMessagingEvent[];
    time: number;
}

export interface MessengerWebhookPayload {
    entry: MessengerWebhookEntry[];
    object: string;
}

export interface MessengerSendApiResponse {
    message_id: string;
    recipient_id: string;
}

export interface MessengerUserProfile {
    first_name?: string;
    id: string;
    last_name?: string;
    profile_pic?: string;
}
