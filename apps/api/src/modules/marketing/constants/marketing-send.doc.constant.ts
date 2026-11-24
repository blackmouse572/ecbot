export const MARKETING_SEND_PARAM = 'send';

export const MarketingSendDocParamsId = [
    {
        name: MARKETING_SEND_PARAM,
        description: 'The ID of the send',
        required: true,
        type: 'string',
    },
];

export const MarketingSendDocQueryList = [
    {
        name: 'mode',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'AUTO',
        description:
            "ONCE (Gửi 1 lần) and/or AUTO (Đang tự gửi), with ',' delimiter",
    },
];
