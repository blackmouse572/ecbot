import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export const RoleDocQueryIsActive = [
    {
        name: 'isActive',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "boolean value with ',' delimiter",
    },
];

export const RoleDocQueryType = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_POLICY_ROLE_TYPE).join(','),
        description: "enum value with ',' delimiter",
    },
];

export const RoleDocParamsId = [
    {
        name: 'role',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '1dc5dcc3-b7d1-48ff-926c-4823fc3e5dc8',
    },
];
