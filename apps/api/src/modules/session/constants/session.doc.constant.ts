import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';

export const SessionDocParamsId = [
    {
        name: 'session',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '3b94edce-b6b1-4f97-a053-86351bef97f3',
    },
];

export const SessionDocQueryStatus = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_SESSION_STATUS).join(','),
        description: "The status of the session, value with ',' delimiter",
    },
];
