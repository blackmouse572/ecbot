import {
    IMessageAttachment,
    ITurnImages,
} from '../interfaces/message-media.interface';

const FIELDS = ['url', 'key', 'description', 'name'] as const;

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

/** How a message's images and files read in chat history: an image by what
 *  the AI saw in it when it described it, a file by its name, else a bare
 *  marker. '' when there is neither. */
export function historyNote(attachments: IMessageAttachment[]): string {
    const images = attachments.filter(isImage);
    const described = images.find(a => a.description)?.description;
    const imageNote = !images.length
        ? ''
        : described
          ? `[image: ${described}]`
          : '[image]';
    const fileNotes = attachments
        .filter(a => a.type === 'file')
        .map(a => (a.name ? `[file: ${a.name}]` : '[file]'));
    return [imageNote, ...fileNotes].filter(Boolean).join(' ');
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

/** The attachment of media the bot sent: an image, or a file (a PDF) kept
 *  with its name so the inbox can show it as a link. */
export function botMedia(media: {
    url: string;
    mime?: string;
    filename?: string;
}): IMessageAttachment {
    if (!media.mime || media.mime.startsWith('image/'))
        return { type: 'image', url: media.url };
    return {
        type: 'file',
        url: media.url,
        ...(media.filename && { name: media.filename }),
    };
}

/** Resolved attachments (stored images already signed) as apps/ai gets them. */
export function forTurn(resolved: IMessageAttachment[]): ITurnImages {
    const images = resolved.filter(isImage);
    return {
        urls: images.flatMap(a => (a.url ? [a.url] : [])),
        unviewable: images.filter(a => !a.url).length,
    };
}
