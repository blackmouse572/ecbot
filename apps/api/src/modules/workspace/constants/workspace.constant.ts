import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import {
    ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT,
} from '@app/modules/role/constants/role.list.constant';
import { RoleCreateRequestDto } from '@app/modules/role/dtos/request/role.create.request.dto';

export const WORKSPACE_DEFAULT_AVAILABLE_SEARCH = ['name', 'slug'];
export const WORKSPACE_EXCLUDE_OWNER_META_KEY = 'WorkspaceExcludeOwnerMetaKey';
export const WORKSPACE_POLICY_ABILITY_META_KEY =
    'WorkspacePolicyAbilityMetaKey';
export const WORKSPACE_POLICY_ROLE_META_KEY = 'WorkspacePolicyRoleMetaKey';
export const WORKSPACE_DEFAULT_SELECT = {
    _id: 1,
    name: 1,
    slug: 1,
} as const;

export const WORKSPACE_INVITATION_CODE_LENGTH = 6;

export const WORKSPACE_DEFAULT_MEMBER_ROLES: RoleCreateRequestDto[] = [
    {
        name: 'Member',
        permissions: [
            ...ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT.map(subject => ({
                action: [ENUM_POLICY_ACTION.MANAGE],
                subject,
            })),
            {
                action: [ENUM_POLICY_ACTION.READ],
                subject: ENUM_POLICY_SUBJECT.TOOL,
            },
            {
                action: [ENUM_POLICY_ACTION.READ],
                subject: ENUM_POLICY_SUBJECT.SKILL,
            },
        ],
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    },
    {
        name: 'Admin',
        permissions: ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT.map(subject => ({
            action: [ENUM_POLICY_ACTION.MANAGE],
            subject,
        })),
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    },
];
