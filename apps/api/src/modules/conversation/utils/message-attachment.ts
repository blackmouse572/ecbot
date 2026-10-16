import {
    IMessageAttachment,
    IMessageReplyTo,
    ITurnImages,
} from '../interfaces/message-media.interface';

const FIELDS = ['url', 'key', 'description', 'emoji', 'name'] as const;
/** Kinds stored like customer photos and read by the image step. */
const VISUAL_TYPES = new Set(['image', 'sticker', 'story']);
/** A quoted message's text is cut to this many characters. */
const QUOTE_MAX_CHARS = 200;

/** A stored attachments value as typed attachments: anything that is not an
 *  object with a string `type` is dropped, and so are unknown fields. */
export function parseAttachments(raw: unknown): IMessageAttachment[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
        const value = item as Record<string, unknown> | null;
        if (typeof value?.type !== 'string') return [];
        const attachment: IMessageAttachment = { type: value.type };
        for (const field of FIELDS) {
            if (typeof value[field] === 'string')
                attachment[field] = value[field];
        }
        return [attachment];
    });
}

function isImage(attachment: IMessageAttachment): boolean {
    return attachment.type === 'image';
}

/** Whether the attachment is stored and described like a customer photo. */
export function isVisual(attachment: IMessageAttachment): boolean {
    return VISUAL_TYPES.has(attachment.type);
}

/** What the agent reads for an attachment that is not a photo: what a sticker
 *  means, what a story shows, or that media arrived it cannot open. */
export function attachmentNote(
    attachment: IMessageAttachment,
    storyReply = false
): string {
    const { description } = attachment;
    switch (attachment.type) {
        case 'sticker':
            if (description) return `[Sticker meaning: ${description}]`;
            return attachment.emoji
                ? `[Sticker: ${attachment.emoji}]`
                : '[Sticker that could not be viewed]';
        case 'story': {
            const what = storyReply
                ? 'Replying to your story'
                : 'Mentioned you in their story';
            return description
                ? `[${what}, which shows: ${description}]`
                : `[${what}]`;
        }
        case 'audio':
            return '[Voice message, which you cannot listen to]';
        case 'video':
            return '[Video, which you cannot watch]';
        case 'file':
            return '[File, which you cannot open]';
        case 'location':
            return '[Shared a location]';
        case 'share':
            return '[Shared a post, which you cannot open]';
        default:
            return '';
    }
}

/** What a quoted reply answers. '' for a story reply: the story's own
 *  attachment note says it. */
export function replyNote(replyTo: IMessageReplyTo | undefined): string {
    if (replyTo?.kind !== 'message') return '';
    if (!replyTo.text) return '[Replying to an earlier message]';
    const whose = replyTo.fromCustomer
        ? 'their own earlier message'
        : 'your message';
    return `[Replying to ${whose}: "${replyTo.text}"]`;
}

/** A quoted message's text as stored on the reply. */
export function quoteText(text: string | undefined): string | undefined {
    if (!text) return undefined;
    return text.length > QUOTE_MAX_CHARS
        ? `${text.slice(0, QUOTE_MAX_CHARS)}…`
        : text;
}

/** How a customer message's attachments read in chat history: what the AI
 *  saw in its images, and a note per other attachment. '' when there is
 *  none. `replyTo` tells a story reply from a story mention; the quoted
 *  message itself is `replyNote`, which goes before the text. */
export function historyNote(
    attachments: IMessageAttachment[],
    replyTo?: IMessageReplyTo
): string {
    const images = attachments.filter(isImage);
    const described = images.find(a => a.description)?.description;
    const imageNote = !images.length
        ? ''
        : described
          ? `[image: ${described}]`
          : '[image]';
    const others = attachments
        .filter(a => !isImage(a))
        .map(a => attachmentNote(a, replyTo?.kind === 'story'));
    return [imageNote, ...others].filter(Boolean).join(' ');
}

/** A customer message as chat history reads it: what it quotes, its text,
 *  then its attachment notes. */
export function customerHistoryText(message: {
    text?: string;
    attachments?: IMessageAttachment[];
    replyTo?: IMessageReplyTo;
}): string {
    return [
        replyNote(message.replyTo),
        message.text,
        historyNote(message.attachments ?? [], message.replyTo),
    ]
        .filter(Boolean)
        .join(' ');
}

/** The attachments with each given description set, by position. */
export function withDescriptions(
    attachments: IMessageAttachment[],
    descriptions: (string | undefined)[]
): IMessageAttachment[] {
    return attachments.map((a, i) =>
        descriptions[i] ? { ...a, description: descriptions[i] } : a
    );
}

/** The attachment of an image or file the bot sent. */
export function botMedia(media: {
    url: string;
    kind: 'image' | 'file';
    name?: string;
}): IMessageAttachment {
    if (media.kind === 'image') return { type: 'image', url: media.url };
    return media.name
        ? { type: 'file', url: media.url, name: media.name }
        : { type: 'file', url: media.url };
}

/** Resolved attachments (stored images already signed) as apps/ai gets them. */
export function forTurn(resolved: IMessageAttachment[]): ITurnImages {
    const images = resolved.filter(isImage);
    return {
        urls: images.flatMap(a => (a.url ? [a.url] : [])),
        unviewable: images.filter(a => !a.url).length,
    };
}
