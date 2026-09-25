/** Budget for downloading one inbound attachment from a platform CDN. */
export const MEDIA_FETCH_TIMEOUT_MS = 10_000;

/** Sent in place of an image apps/ai cannot fetch (same wording as its own
 *  note for a failed fetch), so the agent knows a photo arrived. */
export const UNVIEWABLE_IMAGE_NOTE =
    '[The user sent an image that could not be viewed.]';
