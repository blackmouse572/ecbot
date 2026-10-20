import { ENUM_USER_STATUS } from '@app/modules/user/enums/user.enum';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';

export interface IChannelAlertRecipient {
    id: string;
    email?: string;
    name?: string;
    status?: ENUM_USER_STATUS;
}

interface IChannelAlertMember {
    user: IChannelAlertRecipient;
    role?: {
        isActive?: boolean;
        type?: ENUM_POLICY_ROLE_TYPE;
        permissions?: { subject: ENUM_POLICY_SUBJECT }[];
    } | null;
}

/** Whether a member's role covers channels, so they can reconnect one. */
function managesChannels(member: IChannelAlertMember): boolean {
    const role = member.role;
    if (!role || role.isActive === false) return false;
    if (role.type === ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER) return true;
    return (role.permissions ?? []).some(
        p => p.subject === ENUM_POLICY_SUBJECT.ACCOUNT
    );
}

/**
 * Who hears that a channel is down: the workspace owner, then every active
 * member whose role covers channels. Once per person, active users only.
 */
export function channelAlertRecipients(
    members: IChannelAlertMember[],
    owner?: IChannelAlertRecipient | null
): IChannelAlertRecipient[] {
    const candidates = [
        ...(owner ? [owner] : []),
        ...members.filter(managesChannels).map(m => m.user),
    ];
    const seen = new Set<string>();
    return candidates.filter(u => {
        if (!u?.id || seen.has(u.id)) return false;
        if (u.status && u.status !== ENUM_USER_STATUS.ACTIVE) return false;
        seen.add(u.id);
        return true;
    });
}
