export interface WhatsAppMedia {
    id: string;
    mime_type?: string;
    caption?: string;
    filename?: string;
}

export interface WhatsAppInboundMessage {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: WhatsAppMedia;
    video?: WhatsAppMedia;
    document?: WhatsAppMedia;
    audio?: WhatsAppMedia;
    sticker?: WhatsAppMedia;
    location?: { latitude: number; longitude: number; name?: string };
    interactive?: {
        type: 'button_reply' | 'list_reply';
        button_reply?: { id: string; title: string };
        list_reply?: { id: string; title: string };
    };
    /** Quick-reply button tapped on a template message. */
    button?: { payload: string; text: string };
    reaction?: { message_id: string; emoji?: string };
}

export interface WhatsAppStatus {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
}

export interface WhatsAppChangeValue {
    messaging_product: 'whatsapp';
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: { wa_id: string; profile?: { name?: string } }[];
    messages?: WhatsAppInboundMessage[];
    statuses?: WhatsAppStatus[];
}

export interface WhatsAppWebhookPayload {
    object: string;
    entry: {
        id: string;
        changes: { field: string; value: WhatsAppChangeValue }[];
    }[];
}

export interface WhatsAppSendResponse {
    messages: { id: string }[];
}

export interface WhatsAppPhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
}
