import { handoffEmailRecipients } from '@app/modules/conversation/utils/handoff-email-recipients.util';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';

const user = (id: string, email = `${id}@b.com`) => ({ id, email, name: id });
const member = (id: string, role: any) => ({ user: user(id), role }) as any;
const role = (
    subjects: ENUM_POLICY_SUBJECT[],
    type = ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER
) => ({
    type,
    permissions: subjects.map(subject => ({
        subject,
        action: [ENUM_POLICY_ACTION.READ],
    })),
});

// The handover email goes to the owner and to whoever can see conversations.
describe('handoffEmailRecipients', () => {
    it('includes the owner and members whose role covers conversations', () => {
        const recipients = handoffEmailRecipients(
            [
                member('agent', role([ENUM_POLICY_SUBJECT.CONVERSATION])),
                member('writer', role([ENUM_POLICY_SUBJECT.CHATBOT])),
            ],
            user('owner')
        );

        expect(recipients.map(r => r.id)).toEqual(['owner', 'agent']);
    });

    it('includes members with the workspace-owner role', () => {
        const recipients = handoffEmailRecipients(
            [
                member(
                    'co-owner',
                    role([], ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER)
                ),
            ],
            user('owner')
        );

        expect(recipients.map(r => r.id)).toEqual(['owner', 'co-owner']);
    });

    it('emails the owner once even when they are also a member, and skips users with no email', () => {
        const recipients = handoffEmailRecipients(
            [
                member('owner', role([ENUM_POLICY_SUBJECT.CONVERSATION])),
                {
                    user: user('ghost', ''),
                    role: role([ENUM_POLICY_SUBJECT.CONVERSATION]),
                } as any,
            ],
            user('owner')
        );

        expect(recipients.map(r => r.id)).toEqual(['owner']);
    });

    it('skips people who turned handover emails off, users who are not active, and roles that are off', () => {
        const recipients = handoffEmailRecipients(
            [
                {
                    user: { ...user('quiet'), handoffEmails: false },
                    role: role([ENUM_POLICY_SUBJECT.CONVERSATION]),
                } as any,
                {
                    user: { ...user('blocked'), status: 'BLOCKED' },
                    role: role([ENUM_POLICY_SUBJECT.CONVERSATION]),
                } as any,
                {
                    user: user('stale-role'),
                    role: {
                        ...role([ENUM_POLICY_SUBJECT.CONVERSATION]),
                        isActive: false,
                    },
                } as any,
                member('agent', role([ENUM_POLICY_SUBJECT.CONVERSATION])),
            ],
            { ...user('owner'), handoffEmails: false } as any
        );

        expect(recipients.map(r => r.id)).toEqual(['agent']);
    });
});
