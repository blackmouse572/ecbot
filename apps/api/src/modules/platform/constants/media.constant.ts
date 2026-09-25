/** Budget for downloading one inbound attachment from a platform CDN. */
export const MEDIA_FETCH_TIMEOUT_MS = 10_000;

/** Sent in place of an image apps/ai could not describe (no url, a failed
 *  fetch or a blocked description), so the agent knows a photo arrived. */
export const UNVIEWABLE_IMAGE_NOTE =
    '[The user sent an image that could not be viewed.]';

/** How a burst image's description reads in the Turn's message. */
export const imageDescriptionNote = (description: string): string =>
    `[Image description: ${description}]`;
