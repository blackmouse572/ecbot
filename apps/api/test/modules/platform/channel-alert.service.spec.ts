import * as Sentry from '@sentry/nestjs';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { NotificationType } from '@app/modules/notification/enums/notification.enum';
import { ENUM_CHANNEL_ALERT } from '@app/modules/platform/constants/channel-health.constant';
import { ChannelAlertService } from '@app/modules/platform/services/channel-alert.service';

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));

const owner = { id: 'u-owner', email: 'owner@shop.vn', name: 'Owner' };
const members = [
    // Can manage channels.
    {
        user: { id: 'u-admin', email: 'admin@shop.vn', name: 'Admin' },
        role: {
            type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            permissions: [{ subject: ENUM_POLICY_SUBJECT.ACCOUNT }],
        },
    },
    // Inbox only: not told about channels.
    {
        user: { id: 'u-agent', email: 'agent@shop.vn', name: 'Agent' },
        role: {
            type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            permissions: [{ subject: ENUM_POLICY_SUBJECT.CONVERSATION }],
        },
    },
    { user: owner, role: { type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER } },
];

function makeService() {
    const claimed = new Set<string>();
    const deps = {
        accountRepository: {
            markSendFailing: jest.fn(async () => undefined),
            clearSendFailing: jest.fn(async () => undefined),
        },
        workspaceRepository: {
            findOneById: jest.fn(async () => ({ slug: 'shop', owner })),
        },
        workspaceMemberRepository: {
            findActiveByWorkspace: jest.fn(async () => members),
        },
        notificationService: { create: jest.fn(async () => ({})) },
        messageService: { setMessage: jest.fn((key: string) => key) },
        cloudTasksClient: { enqueue: jest.fn(async () => undefined) },
        rateLimit: {
            claim: jest.fn(async (key: string) => {
                if (claimed.has(key)) return false;
                claimed.add(key);
                return true;
            }),
            reset: jest.fn(async (key: string) => {
                claimed.delete(key);
            }),
        },
        orm: { em: { populate: jest.fn(async () => undefined) } },
    };
    const service = new ChannelAlertService(
        deps.accountRepository as any,
        deps.workspaceRepository as any,
        deps.workspaceMemberRepository as any,
        deps.notificationService as any,
        deps.messageService as any,
        deps.cloudTasksClient as any,
        deps.rateLimit as any,
        deps.orm as any
    );
    return { service, ...deps };
}

const account = (): any => ({
    id: 'acc-1',
    name: 'Shop Page',
    type: 'FACEBOOK_PAGE',
    workspace: { id: 'ws-1' },
    chatbot: { primaryLanguage: 'vi' },
});

describe('ChannelAlertService', () => {
    beforeEach(() => jest.clearAllMocks());

    it('marks the channel failing and tells the owner and channel admins by bell and email', async () => {
        const s = makeService();
        const acc = account();

        await s.service.open(
            acc,
            ENUM_CHANNEL_ALERT.SEND_FAILING,
            new Error('HTTP 500')
        );

        expect(s.accountRepository.markSendFailing).toHaveBeenCalledWith(
            'acc-1',
            expect.any(Date),
            'HTTP 500'
        );
        expect(acc.sendFailingSince).toBeInstanceOf(Date);
        const bellTo = s.notificationService.create.mock.calls.map(
            (c: any[]) => c[0].recipient
        );
        expect(bellTo.sort()).toEqual(['u-admin', 'u-owner']);
        expect(
            (s.notificationService.create.mock.calls[0] as any[])[0]
        ).toMatchObject({
            title: 'notification.channelSendFailing.title',
            type: NotificationType.ERROR,
            workspace: 'ws-1',
            metadata: { actionUrl: '/shop/accounts' },
        });
        expect(s.cloudTasksClient.enqueue).toHaveBeenCalledTimes(2);
        expect(s.cloudTasksClient.enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED,
            expect.objectContaining({
                data: expect.objectContaining({
                    reason: 'send_failing',
                    language: 'vi',
                }),
            }),
            expect.anything()
        );
        expect(Sentry.captureMessage).toHaveBeenCalledWith(
            expect.stringContaining('send_failing'),
            expect.objectContaining({
                fingerprint: ['channel-alert', 'FACEBOOK_PAGE', 'send_failing'],
            })
        );
    });

    it('alerts once per channel and kind until the reminder window passes', async () => {
        const s = makeService();
        const acc = account();

        await s.service.open(acc, ENUM_CHANNEL_ALERT.SEND_FAILING, 'x');
        await s.service.open(acc, ENUM_CHANNEL_ALERT.SEND_FAILING, 'x');

        expect(s.notificationService.create).toHaveBeenCalledTimes(2);
        expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
        // Still records the latest error.
        expect(s.accountRepository.markSendFailing).toHaveBeenCalledTimes(2);
    });

    it('keeps the original start time while the channel stays down', async () => {
        const s = makeService();
        const since = new Date('2026-10-19T10:00:00Z');
        const acc = { ...account(), sendFailingSince: since };

        await s.service.open(acc, ENUM_CHANNEL_ALERT.AUTH_FAILED, 'x');

        expect(s.accountRepository.markSendFailing).toHaveBeenCalledWith(
            'acc-1',
            since,
            'x'
        );
    });

    it('on recovery clears the state, re-arms alerts and rings the bell without email', async () => {
        const s = makeService();
        const acc = account();
        await s.service.open(acc, ENUM_CHANNEL_ALERT.SEND_FAILING, 'x');
        jest.clearAllMocks();

        await s.service.recovered(acc);

        expect(s.accountRepository.clearSendFailing).toHaveBeenCalledWith(
            'acc-1'
        );
        expect(acc.sendFailingSince).toBeNull();
        expect(s.notificationService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'notification.channelRecovered.title',
                type: NotificationType.SUCCESS,
            })
        );
        expect(s.cloudTasksClient.enqueue).not.toHaveBeenCalled();

        // The next outage alerts again.
        await s.service.open(acc, ENUM_CHANNEL_ALERT.SEND_FAILING, 'x');
        expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    });
});
