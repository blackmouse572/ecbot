import { ENUM_TOOL_KIND } from '../enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from '../enums/tool-status.enum';

export const ToolDocParamsId = [
    {
        name: 'toolId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '2b760cb0-eaeb-40b0-b1cb-ff95ebeb9845',
    },
];

export const ToolAdminDocQueryList = [
    {
        name: 'kind',
        required: false,
        type: 'string',
        example: Object.values(ENUM_TOOL_KIND).join(','),
        description: "enum value with ',' delimiter",
    },
    {
        name: 'status',
        required: false,
        type: 'string',
        example: Object.values(ENUM_TOOL_STATUS).join(','),
        description: "enum value with ',' delimiter",
    },
    {
        name: 'workspace',
        required: false,
        type: 'string',
        description: 'workspace id',
    },
];
