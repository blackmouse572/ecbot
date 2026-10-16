export type TextContent = { kind: 'text'; text: string };
export type CardContent = { kind: 'card'; card: Card };
export type MediaContent = {
    kind: 'media';
    url: string;
    mediaType: 'image' | 'video' | 'file';
    caption?: string;
    /** File only: the name the customer sees on it. */
    name?: string;
};

export interface Card {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    body?: string;
    buttons?: Button[];
}

export type Button =
    | { kind: 'postback'; id: string; label: string; value?: string }
    | { kind: 'link'; label: string; url: string };

export interface QuickReply {
    id: string;
    label: string;
    value?: string;
}

export interface OutboundMessage {
    content: TextContent | CardContent | MediaContent;
    quickReplies?: QuickReply[];
    fallbackText: string;
}

export interface AdapterCapabilities {
    cards: boolean;
    buttons: boolean;
    quickReplies: boolean;
    media: boolean;
    editMessage: boolean;
    deleteMessage: boolean;
    reactions: { inbound: boolean; outbound: boolean };
    typing: boolean;
    /**
     * How often to re-send the typing indicator while a reply generates, when
     * the platform expires it sooner than MESSAGE_TYPING_REFRESH_MS allows.
     */
    typingRefreshMs?: number;
    markRead: boolean;
}

export function text(s: string): OutboundMessage {
    return { content: { kind: 'text', text: s }, fallbackText: s };
}

/** An image or file the reply sends (an apps/ai `file` part). */
export interface ReplyMedia {
    url: string;
    kind: 'image' | 'file';
    /** File only: its name, e.g. "Menu Mộc Đà Nẵng.pdf". */
    name?: string;
}

function media(m: ReplyMedia): OutboundMessage {
    if (m.kind === 'image') {
        return {
            content: { kind: 'media', url: m.url, mediaType: 'image' },
            fallbackText: m.url,
        };
    }
    return {
        content: { kind: 'media', url: m.url, mediaType: 'file', name: m.name },
        // A channel that cannot send files gets the link, under its name.
        fallbackText: m.name ? `${m.name}\n${m.url}` : m.url,
    };
}

/** One reply segment: its text, and the media that arrived while it was
 *  open. */
export interface ReplySegment {
    text: string;
    media: ReplyMedia[];
}

/** A segment's platform messages: its text, then each image or file.
 *  Markdown in the text is not read: apps/ai already turned allowed images
 *  into file parts. */
export function segmentMessages(segment: ReplySegment): OutboundMessage[] {
    const rest = segment.text.trim();
    return [...(rest ? [text(rest)] : []), ...segment.media.map(media)];
}

// Round-trip a button/quick-reply id+value through a platform payload string.
export function encodeActionPayload(id: string, value?: string): string {
    return JSON.stringify({ id, value });
}

export function decodeActionPayload(payload: string): {
    id: string;
    value?: string;
} {
    try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed.id === 'string') {
            return { id: parsed.id, value: parsed.value };
        }
    } catch {
        // not our JSON envelope — treat the raw string as the action id
    }
    return { id: payload };
}
