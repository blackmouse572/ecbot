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
    {
        name: 'preset',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'ASKED_PRICE',
        description: "The stage a send was made for, with ',' delimiter",
    },
    {
        name: 'active',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'false',
        description:
            "true (on) and/or false (Đã tắt tự gửi), with ',' delimiter. A one-off send is always true, so pair it with mode=AUTO for Đang tự gửi",
    },
];
