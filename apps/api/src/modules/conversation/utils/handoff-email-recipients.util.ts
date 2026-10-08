import { ENUM_USER_STATUS } from '@app/modules/user/enums/user.enum';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';

interface IRecipientUser {
    id: string;
    email: string;
    name: string;
    status?: ENUM_USER_STATUS;
    /** The person's own choice; off means no handover emails. */
    handoffEmails?: boolean;
}

interface IRecipientMember {
    user: IRecipientUser;
    role?: {
        isActive?: boolean;
        type?: ENUM_POLICY_ROLE_TYPE;
        permissions?: { subject: ENUM_POLICY_SUBJECT }[];
    } | null;
}

/** Whether a member's role lets them see conversations at all. */
function canSeeConversations(member: IRecipientMember): boolean {
    const role = member.role;
    if (!role || role.isActive === false) return false;
    if (role.type === ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER) return true;
    return (role.permissions ?? []).some(
        p => p.subject === ENUM_POLICY_SUBJECT.CONVERSATION
    );
}

/**
 * Who gets the handover email: the workspace owner, then every active
 * member whose (active) role covers conversations. One email per person,
 * only to active users with an address who have not turned these off.
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
        if (u.handoffEmails === false) return false;
        if (u.status && u.status !== ENUM_USER_STATUS.ACTIVE) return false;
        seen.add(u.id);
        return true;
    });
}
