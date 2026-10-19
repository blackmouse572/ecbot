// A user keeps push on this many browsers at most; the oldest drops off.
export const NOTIFICATION_PUSH_MAX_DEVICES_PER_USER = 20;

// Pushes sent at once for one notification, so many devices can't fan out.
export const NOTIFICATION_PUSH_SEND_BATCH_SIZE = 10;

// The browsers' own push services. A subscription endpoint must be on one of
// these, so the API never POSTs to a host a client picked (SSRF).
export const NOTIFICATION_PUSH_SERVICE_HOSTS: (string | RegExp)[] = [
    'fcm.googleapis.com',
    'android.googleapis.com',
    /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/,
    /^([a-z0-9-]+\.)*notify\.windows\.com$/,
    /^([a-z0-9-]+\.)*push\.apple\.com$/,
];
