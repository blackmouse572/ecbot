import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';

export const UserDocParamsId = [
    {
        name: 'user',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '56d0df5f-1479-4009-a25e-4320281260ef',
    },
];

export const UserDocQueryRoleType = [
    {
        name: 'roleType',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_POLICY_ROLE_TYPE).join(','),
        description: "value with ',' delimiter",
    },
];

export const UserDocQueryCountry = [
    {
        name: 'country',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: '455a5438-3d9e-4cc9-b7c1-1eaeb8747189',
    },
];

export const UserDocQueryStatus = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_USER_STATUS).join(','),
        description: "value with ',' delimiter",
    },
];
