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
    type: 'image' | 'video' | 'audio' | 'file' | 'fallback' | 'location';
}

export interface MessengerMessagePayload {
    /** Echoes only: set when an app sent the message via the Send API. */
    app_id?: number;
    attachments?: MessengerAttachment[];
    is_echo?: boolean;
    mid: string;
    quick_reply?: { payload: string };
    text?: string;
}

export interface MessengerPostback {
    mid?: string;
    payload: string;
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
