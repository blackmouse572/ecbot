/** Downloaded media bytes, ready to store. */
export interface IMessageMedia {
    data: Buffer;
    mime: string;
}

/**
 * A stored message attachment. Customer images carry a private S3 `key`
 * (resolved to a short-lived URL on read); bot media carry their public `url`.
 * `description` is what the AI saw in a customer image, kept for later turns.
 * `name` is the title of a file the bot sent (`type: 'file'`, a PDF).
 */
export interface IMessageAttachment {
    type: string;
    url?: string;
    key?: string;
    description?: string;
    name?: string;
}

/** A Turn's images as apps/ai gets them. */
export interface ITurnImages {
    /** Fetchable image urls (stored ones already signed). */
    urls: string[];
    /** Images with no url, e.g. a Telegram photo whose download failed. */
    unviewable: number;
}
