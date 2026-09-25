import {
    IMessageAttachment,
    ITurnImages,
} from '../interfaces/message-media.interface';

const FIELDS = ['url', 'key', 'description'] as const;

/** A stored attachments value as typed attachments: anything that is not an
 *  object with a string `type` is dropped, and so are unknown fields. */
export function parseAttachments(raw: unknown): IMessageAttachment[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
        const value = item as Record<string, unknown> | null;
        if (typeof value?.type !== 'string') return [];
        const attachment: IMessageAttachment = { type: value.type };
        for (const field of FIELDS) {
            if (typeof value[field] === 'string') attachment[field] = value[field];
        }
        return [attachment];
    });
}

function isImage(attachment: IMessageAttachment): boolean {
    return attachment.type === 'image';
}

/** How a message's images read in chat history: what the AI saw in them
 *  when it described them, else a bare marker. '' when there is no image. */
export function historyNote(attachments: IMessageAttachment[]): string {
    const images = attachments.filter(isImage);
    if (!images.length) return '';
    const described = images.find(a => a.description)?.description;
    return described ? `[image: ${described}]` : '[image]';
}

/** The attachments with `description` set on each image. */
export function withDescription(
    attachments: IMessageAttachment[],
    description: string
): IMessageAttachment[] {
    return attachments.map(a => (isImage(a) ? { ...a, description } : a));
}

/** The attachment of an image the bot sent. */
export function botImage(url: string): IMessageAttachment {
    return { type: 'image', url };
}

/** Resolved attachments (stored images already signed) as apps/ai gets them. */
export function forTurn(resolved: IMessageAttachment[]): ITurnImages {
    const images = resolved.filter(isImage);
    return {
        urls: images.flatMap(a => (a.url ? [a.url] : [])),
        unviewable: images.filter(a => !a.url).length,
    };
}
