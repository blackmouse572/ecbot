/** Downloaded media bytes, ready to store. */
export interface IMessageMedia {
    data: Buffer;
    mime: string;
}

/**
 * A stored message attachment. Customer images carry a private S3 `key`
 * (resolved to a short-lived URL on read); bot images carry their public `url`.
 */
export interface IMessageAttachment {
    type: string;
    url?: string;
    key?: string;
}
