import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { randomUUID } from 'crypto';

const id1 = randomUUID();
const id2 = randomUUID();
const id3 = randomUUID();
const id4 = randomUUID();

export const rolesMock = [
    {
        id: id1,
        name: 'test-role-active-workspace',
        description: 'Test Role',
        type: ENUM_POLICY_ROLE_TYPE.USER,
        isActive: true,
        permissions: [
            {
                subject: ENUM_POLICY_SUBJECT.ACTIVITY,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
            {
                subject: ENUM_POLICY_SUBJECT.AUTH,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
        ],
        workspace: randomUUID(),
    },
    {
        id: id2,
        name: 'test-role-inactive-workspace',
        description: 'Test Role',
        type: ENUM_POLICY_ROLE_TYPE.USER,
        isActive: false,
        permissions: [
            {
                subject: ENUM_POLICY_SUBJECT.ACTIVITY,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
            {
                subject: ENUM_POLICY_SUBJECT.AUTH,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
        ],
        workspace: randomUUID(),
    },
    {
        id: id3,
        name: 'test-role-active',
        description: 'Test Role',
        type: ENUM_POLICY_ROLE_TYPE.USER,
        isActive: true,
        permissions: [
            {
                subject: ENUM_POLICY_SUBJECT.ACTIVITY,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
            {
                subject: ENUM_POLICY_SUBJECT.AUTH,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
        ],
    },
    {
        id: id4,
        name: 'test-role-inactive',
        description: 'Test Role',
        type: ENUM_POLICY_ROLE_TYPE.USER,
        isActive: false,
        permissions: [
            {
                subject: ENUM_POLICY_SUBJECT.ACTIVITY,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
            {
                subject: ENUM_POLICY_SUBJECT.AUTH,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
        ],
    },
];
export const mockRole = rolesMock[0];
