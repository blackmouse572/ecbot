export type TextContent = { kind: 'text'; text: string };
export type CardContent = { kind: 'card'; card: Card };
export type MediaContent = {
    kind: 'media';
    url: string;
    mediaType: 'image' | 'video' | 'file';
    caption?: string;
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
    markRead: boolean;
}

export function text(s: string): OutboundMessage {
    return { content: { kind: 'text', text: s }, fallbackText: s };
}

function image(url: string): OutboundMessage {
    return {
        content: { kind: 'media', url, mediaType: 'image' },
        fallbackText: url,
    };
}

/** Whether any attachment is an image (stored, linked, or id-only). */
export function hasImage(attachments?: unknown[]): boolean {
    return (attachments ?? []).some(
        a => (a as { type?: unknown } | null)?.type === 'image'
    );
}

/** How a message's images read in chat history: what the AI saw in them
 *  when it described them, else a bare marker. '' when there is no image. */
export function imageHistoryNote(attachments?: unknown[]): string {
    if (!hasImage(attachments)) return '';
    const described = (attachments ?? [])
        .map(a => (a as { description?: unknown } | null)?.description)
        .find((d): d is string => typeof d === 'string' && d.length > 0);
    return described ? `[image: ${described}]` : '[image]';
}

/** URLs of the image attachments we can actually fetch (some platforms only
 *  give a file id — those are skipped). */
export function imageUrls(attachments?: unknown[]): string[] {
    return (attachments ?? []).flatMap(a => {
        const { type, url } = (a ?? {}) as { type?: unknown; url?: unknown };
        return type === 'image' && typeof url === 'string' ? [url] : [];
    });
}

// Must never match more than the apps/ai filter that screens image urls: an
// image it did not see must not become a media message. So alt text stays
// on one line, and the url also stops at \x1c-\x1f and \x85, which Python's
// \s covers and JS's does not.
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\((https?:\/\/[^\s)\x1c-\x1f\x85]+)\)/g;

/** A reply segment holding just one image — how a `send_image` file part
 *  joins the segment stream (`replyMessages` turns it into a media message). */
export function imageSegment(url: string): string {
    return `![](${url})`;
}

/** Split one reply segment into platform messages: its text, then one media
 *  message per markdown image (`![alt](url)`) the agent wrote. */
export function replyMessages(segment: string): OutboundMessage[] {
    const urls = [...segment.matchAll(MARKDOWN_IMAGE)].map(m => m[1]);
    const rest = segment.replace(MARKDOWN_IMAGE, '').trim();
    return [...(rest ? [text(rest)] : []), ...urls.map(image)];
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
