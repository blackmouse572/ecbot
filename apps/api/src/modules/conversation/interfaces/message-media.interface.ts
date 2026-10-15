/** Downloaded media bytes, ready to store. */
export interface IMessageMedia {
    data: Buffer;
    mime: string;
}

/**
 * A stored message attachment. Customer images, stickers and stories carry a private S3 `key`
 * (resolved to a short-lived URL on read); bot images carry their public `url`.
 * `description` is what the AI saw in a customer image, kept for later turns.
 */
export interface IMessageAttachment {
    type: string;
    url?: string;
    key?: string;
    description?: string;
    /** Sticker only: the emoji the platform pairs with it. */
    emoji?: string;
}

/** What an inbound message answers, as stored on the message. */
export interface IMessageReplyTo {
    kind: 'message' | 'story';
    /** The quoted message's platform id. */
    externalId?: string;
    /** Our copy of the quoted message, when we have it. */
    messageId?: string;
    /** The quoted message's text, cut short, as it read when quoted. */
    text?: string;
    /** The quoted message was the customer's own, not the business's. */
    fromCustomer?: boolean;
}

/** A Turn's images as apps/ai gets them. */
export interface ITurnImages {
    /** Fetchable image urls (stored ones already signed). */
    urls: string[];
    /** Images with no url, e.g. a Telegram photo whose download failed. */
    unviewable: number;
}
