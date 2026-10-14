import { IMediaPart } from '@app/modules/chatbot/interfaces/media-part-wire.interface';

export type TextContent = { kind: 'text'; text: string };
export type CardContent = { kind: 'card'; card: Card };
export type MediaContent = {
    kind: 'media';
    url: string;
    mediaType: 'image' | 'video' | 'file';
    caption?: string;
    /** Known for knowledge media; absent for a `send_image` picture. */
    mime?: string;
    size?: number;
    filename?: string;
    /** Smaller copies to send when the original is over a channel's limit. */
    alternatives?: MediaAlternative[];
};

export interface MediaAlternative {
    url: string;
    mime: string;
    size: number;
}

/** What a channel takes for one kind of media. */
export interface MediaLimit {
    mimes: string[];
    maxBytes: number;
}

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
    /** Per-kind caps on outbound media; a kind left out has no limit. */
    mediaLimits?: { image?: MediaLimit; file?: MediaLimit };
}

export function text(s: string): OutboundMessage {
    return { content: { kind: 'text', text: s }, fallbackText: s };
}

/** A file sent as a plain link: its name, then its url. */
export function mediaText(c: MediaContent): string {
    return `${c.filename ?? c.caption ?? ''}\n${c.url}`.trim();
}

function media(m: IMediaPart): OutboundMessage {
    const content: MediaContent = {
        kind: 'media',
        url: m.url,
        mediaType: !m.mime || m.mime.startsWith('image/') ? 'image' : 'file',
        ...(m.mime && { mime: m.mime }),
        ...(m.filename && { filename: m.filename }),
        ...(m.size !== undefined && { size: m.size }),
        ...(m.compact && { alternatives: [m.compact] }),
    };
    return { content, fallbackText: mediaText(content) };
}

/** One reply segment: its text, and the media (apps/ai `file` parts) that
 *  arrived while it was open. */
export interface ReplySegment {
    text: string;
    media: IMediaPart[];
}

/** A segment's platform messages: its text, then each media. Markdown in the
 *  text is not read: apps/ai already turned allowed images into file parts. */
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
