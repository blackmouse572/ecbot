import { ENUM_WORKSPACE_STATUS } from '../enums/workspace.enum';

export const WorkspaceIdDocParamsId = [
    {
        name: 'workspaceId',
        description: 'The ID or slug of the workspace',
        required: true,
        type: 'string',
    },
];

export const WorkspaceDocParamsId = [
    {
        name: 'workspace',
        description: 'The ID or slug of the workspace',
        required: true,
        type: 'string',
    },
];

export const WorkspaceDocInvitationParams = [
    {
        name: 'invitationcode',
        description: 'The invitation code for the workspace',
        required: true,
        type: 'string',
    },
];

export const WorkspaceAdminDocParamsId = [
    {
        name: 'workspace',
        description: 'The ID of the workspace',
        required: true,
        type: 'string',
        example: 'ae309c15-ead3-4301-9c27-017560675c87',
    },
];

export const WorkspaceAdminDocQueryList = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_WORKSPACE_STATUS).join(','),
        description: "The status of the workspace, value with ',' delimiter",
    },
    {
        name: 'owner',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'lan@shop.vn',
        description: "Part of the owner's name or email, case-insensitive",
    },
];
