// Threads webhook and Graph API shapes, trimmed to the fields the adapter reads.

export interface ThreadsWebhookValue {
    id: string;
    username?: string;
    text?: string;
    media_type?: string;
    media_url?: string;
    permalink?: string;
    shortcode?: string;
    timestamp?: string;
    replied_to?: { id: string };
    root_post?: { id: string; owner_id?: string; username?: string };
}

export interface ThreadsWebhookChange {
    field: string;
    value?: ThreadsWebhookValue;
}

/**
 * Threads delivers its own envelope: the linked user is `target_id` and the
 * change sits in `values` (one object, or a list when Meta batches). The
 * classic Meta `entry[].changes[]` envelope is accepted as well, keyed on
 * `entry.id`.
 */
export interface ThreadsWebhookPayload {
    app_id?: string;
    topic?: string;
    target_id?: string;
    time?: number;
    values?: ThreadsWebhookChange | ThreadsWebhookChange[];
    object?: string;
    entry?: { id: string; time?: number; changes?: ThreadsWebhookChange[] }[];
}

export interface ThreadsProfile {
    id: string;
    username: string;
    name?: string;
    threads_profile_picture_url?: string;
}
