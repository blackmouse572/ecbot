import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';

interface IRecipientUser {
    id: string;
    email: string;
    name: string;
}

interface IRecipientMember {
    user: IRecipientUser;
    role?: {
        type?: ENUM_POLICY_ROLE_TYPE;
        permissions?: { subject: ENUM_POLICY_SUBJECT }[];
    } | null;
}

/** Whether a member's role lets them see conversations at all. */
function canSeeConversations(member: IRecipientMember): boolean {
    const role = member.role;
    if (!role) return false;
    if (role.type === ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER) return true;
    return (role.permissions ?? []).some(
        p => p.subject === ENUM_POLICY_SUBJECT.CONVERSATION
    );
}

/**
 * Who gets the handover email: the workspace owner, then every active
 * member whose role covers conversations. One email per person, and only
 * to people with an address.
 */
export function handoffEmailRecipients(
    members: IRecipientMember[],
    owner?: IRecipientUser | null
): IRecipientUser[] {
    const candidates = [
        ...(owner ? [owner] : []),
        ...members.filter(canSeeConversations).map(m => m.user),
    ];
    const seen = new Set<string>();
    return candidates.filter(u => {
        if (!u?.email || seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
    });
}
