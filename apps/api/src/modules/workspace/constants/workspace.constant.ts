import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT } from '@app/modules/role/constants/role.list.constant';
import { RoleCreateRequestDto } from '@app/modules/role/dtos/request/role.create.request.dto';

export const WORKSPACE_DEFAULT_AVAILABLE_SEARCH = ['name', 'slug'];
// A member row holds no name of its own; search the joined user.
export const WORKSPACE_MEMBER_AVAILABLE_SEARCH = ['user.name', 'user.email'];
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

// The slug column is varchar(100). The pattern matches the app's edit form.
export const WORKSPACE_SLUG_MAX_LENGTH = 100;
export const WORKSPACE_SLUG_PATTERN = /^[a-z0-9-]+$/;

// The role a member receives when an invitation carries no role, or a join
// request is approved. Built-in roles share the WORKSPACE_MEMBER type, so look
// it up by name too.
export const WORKSPACE_DEFAULT_MEMBER_ROLE_NAME = 'Sales';

const manage = (...subjects: ENUM_POLICY_SUBJECT[]) =>
    subjects.map(subject => ({ action: [ENUM_POLICY_ACTION.MANAGE], subject }));
const read = (...subjects: ENUM_POLICY_SUBJECT[]) =>
    subjects.map(subject => ({ action: [ENUM_POLICY_ACTION.READ], subject }));

// The built-in roles every workspace gets next to its owner. A role's
// permissions are copied into the row when it is created, so changing these
// needs a migration for existing workspaces.
export const WORKSPACE_DEFAULT_MEMBER_ROLES: RoleCreateRequestDto[] = [
    {
        name: 'Manager',
        description:
            'Runs the workspace day to day. Everything except channels, roles, invitations and billing.',
        permissions: manage(...ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT),
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    },
    {
        name: WORKSPACE_DEFAULT_MEMBER_ROLE_NAME,
        description:
            'Chats with customers, keeps customer details and takes orders.',
        permissions: [
            ...manage(
                ENUM_POLICY_SUBJECT.CONVERSATION,
                ENUM_POLICY_SUBJECT.CUSTOMER,
                ENUM_POLICY_SUBJECT.ORDER
            ),
            ...read(ENUM_POLICY_SUBJECT.CHATBOT),
        ],
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    },
    {
        name: 'Marketing',
        description:
            'Runs marketing: overview, audiences, sends and customer sources. Views conversations, customers and orders.',
        permissions: [
            ...manage(ENUM_POLICY_SUBJECT.MARKETING),
            ...read(
                ENUM_POLICY_SUBJECT.CONVERSATION,
                ENUM_POLICY_SUBJECT.CUSTOMER,
                ENUM_POLICY_SUBJECT.ORDER
            ),
        ],
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    },
    {
        name: 'Developer',
        description:
            'Builds agents, knowledge, tools, skills and API keys. Views conversations and customers to check replies.',
        permissions: [
            ...manage(
                ENUM_POLICY_SUBJECT.CHATBOT,
                ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                ENUM_POLICY_SUBJECT.RAG,
                ENUM_POLICY_SUBJECT.TOOL,
                ENUM_POLICY_SUBJECT.SKILL,
                ENUM_POLICY_SUBJECT.CLIENT_CREDENTIAL
            ),
            ...read(
                ENUM_POLICY_SUBJECT.TOKEN_USAGE,
                ENUM_POLICY_SUBJECT.CONVERSATION,
                ENUM_POLICY_SUBJECT.CUSTOMER
            ),
        ],
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    },
];

/**
 * The member guard remembers a confirmed membership per instance for this
 * long. Removing a member takes up to this long to lock them out everywhere;
 * policy checks for non-owners still read the member's role fresh.
 */
export const WORKSPACE_MEMBER_CACHE_TTL_MS = 30_000;
export const WORKSPACE_MEMBER_CACHE_MAX_ENTRIES = 5_000;
