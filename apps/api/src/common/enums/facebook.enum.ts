export enum ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE {
    PAGE = 'page',
    USER = 'user',
    PERMISSIONS = 'permissions',
    PAYMENTS = 'payments',
}

export const FACEBOOK_SUBSCRIPTION_FIELD: Record<
    ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE,
    string[]
> = {
    [ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE]: [
        'messages',
        'messaging_postbacks',
        'messaging_optins',
        'messaging_handovers',
        'messaging_policy_enforcement',
        'message_deliveries',
        'message_reads',
        'message_echoes',
        'standby',
    ],

    [ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.USER]: [
        'name',
        'first_name',
        'last_name',
        'profile_pic',
        'locale',
        'timezone',
        'gender',
    ],

    [ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PERMISSIONS]: [
        'granted_scopes',
        'declined_scopes',
    ],

    [ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAYMENTS]: [
        'payment_status',
        'amount',
        'currency',
    ],
};

export enum ENUM_FACEBOOK_MESSAGE_EVENT_TYPE {
    MESSAGE = 'message',
    ECHO = 'echo',
    POSTBACK = 'postback',
    ACCOUNT_LINKING = 'account_linking',
    DELIVERY = 'delivery',
    READ = 'read',
    REFERRAL = 'referral',
    UNKNOWN = 'unknown',
}

export enum ENUM_FACEBOOK_ATTACHMENT_TYPE {
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    FILE = 'file',
    FALLBACK = 'fallback',
    TEMPLATE = 'template',
    LOCATION = 'location',
}

export enum ENUM_FACEBOOK_PLATFORM {
    MESSENGER = 'messenger',
    WHATSAPP = 'whatsapp',
    INSTAGRAM = 'instagram',
    FACEBOOK = 'facebook',
}
