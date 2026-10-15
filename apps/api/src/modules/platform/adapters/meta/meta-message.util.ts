import {
    PlatformAttachment,
    PlatformReplyTo,
} from '../../interfaces/platform-adapter.interface';
import { MessengerMessagePayload } from '../messenger/messenger.types';

// Shared by Messenger and Instagram, which send the same message shape.

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'file', 'location']);
/** Shared posts and reels: Meta sends a CDN link we can't show as a post. */
const SHARE_TYPES = new Set(['share', 'ig_reel', 'reel', 'ig_post']);
/** Instagram's big heart, sent with no image. */
const HEART = '❤️';

/** A Meta message's attachments as we keep them. Link previews (`fallback`)
 *  and templates are dropped: the text already carries the link. A story
 *  reply's story comes first, as a `story` attachment. */
export function metaAttachments(
    message: MessengerMessagePayload
): PlatformAttachment[] | undefined {
    const story = message.reply_to?.story;
    const list: PlatformAttachment[] = story
        ? [{ type: 'story', url: story.url, raw: story }]
        : [];
    for (const a of message.attachments ?? []) {
        const url = a.payload?.url;
        if (a.type === 'image' && a.payload?.sticker_id)
            list.push({ type: 'sticker', url, raw: a });
        else if (MEDIA_TYPES.has(a.type))
            list.push({
                type: a.type as PlatformAttachment['type'],
                url,
                raw: a,
            });
        else if (SHARE_TYPES.has(a.type))
            list.push({ type: 'share', url, raw: a });
        else if (a.type === 'story_mention')
            list.push({ type: 'story', url, raw: a });
        else if (a.type === 'like_heart')
            list.push({ type: 'sticker', emoji: HEART, raw: a });
    }
    return list.length ? list : undefined;
}

/** What a Meta message answers: a quoted message or the account's story. */
export function metaReplyTo(
    message: MessengerMessagePayload
): PlatformReplyTo | undefined {
    const replyTo = message.reply_to;
    if (replyTo?.story) return { kind: 'story' };
    if (replyTo?.mid)
        return { kind: 'message', externalMessageId: replyTo.mid };
    return undefined;
}
