import { createHmac } from 'crypto';
import { Logger } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ApiChannelPlatformAdapter } from '../../../src/modules/platform/adapters/api-channel/api-channel.platform-adapter';
import { OutboundMessage } from '../../../src/modules/platform/interfaces/message-model';
import { EgressBlockedError } from '../../../src/common/helper/services/helper.egress.service';

const SIGNING_SECRET = 'signing-secret-plaintext';

function makeAccount(overrides: Record<string, any> = {}) {
    return {
        id: 'acc-1',
        externalId: 'api-key-abc',
        type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
        config: {
            callbackUrl: 'https://third-party.example.com/hook',
            signingSecret: 'ENCRYPTED',
        },
        ...overrides,
    } as any;
}

function makeAdapter() {
    const accountService = {
        decryptToken: (v: string) =>
            v === 'ENCRYPTED' ? SIGNING_SECRET : v,
        findOne: jest.fn().mockResolvedValue(null),
    };
    const callbackService = {
        signaturePayload: (timestamp: string, body: unknown) =>
            `${timestamp}.${JSON.stringify(body)}`,
        sign: (secret: string, payload: string) =>
            createHmac('sha256', secret).update(payload).digest('hex'),
        deliver: jest.fn(),
    };
    const adapter = new ApiChannelPlatformAdapter(
        accountService as any,
        callbackService as any
    );
    return { adapter, accountService, callbackService };
}

const textMsg = (text: string): OutboundMessage => ({
    content: { kind: 'text', text },
    fallbackText: text,
});

// ─── inbound guards ──────────────────────────────────────────────────────────

describe('ApiChannelPlatformAdapter inbound', () => {
    it('never accepts the generic /public/webhooks/:platform ingress', () => {
        // The slug IS registered so `api` resolves, but this channel authenticates
        // via ClientCredentialGuard on /client — the unauthenticated webhook route
        // must always 403 rather than become a message-injection hole.
        const { adapter } = makeAdapter();
        expect(adapter.verifySignature('{}', {})).toBe(false);
        expect(
            adapter.verifySignature('{}', { 'x-eccho-signature': 'anything' })
        ).toBe(false);
    });

    it('has no challenge handshake', () => {
        const { adapter } = makeAdapter();
        expect(adapter.verifyChallenge({} as any)).toBeNull();
    });

    it('parses a first-party inbound message into one event', () => {
        const { adapter } = makeAdapter();
        const events = adapter.parse(
            JSON.stringify({
                accountKey: 'api-key-abc',
                senderId: 'user-9',
                text: 'hello',
                messageId: 'm-1',
                timestamp: '2026-09-04T10:00:00.000Z',
            })
        );

        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            kind: 'message',
            accountKey: 'api-key-abc',
            senderId: 'user-9',
            recipientId: 'api-key-abc',
            externalMessageId: 'm-1',
            text: 'hello',
        });
        expect(events[0].timestamp).toEqual(
            new Date('2026-09-04T10:00:00.000Z')
        );
    });

    it('mints a messageId when the caller omits one', () => {
        const { adapter } = makeAdapter();
        const [event] = adapter.parse(
            JSON.stringify({
                accountKey: 'api-key-abc',
                senderId: 'user-9',
                text: 'hello',
            })
        );
        expect(event.externalMessageId).toEqual(expect.any(String));
        expect(event.externalMessageId!.length).toBeGreaterThan(0);
    });

    it('returns no events for unparseable input', () => {
        const { adapter } = makeAdapter();
        expect(adapter.parse('not json')).toEqual([]);
        expect(adapter.parse('null')).toEqual([]);
    });
});

// ─── outbound ────────────────────────────────────────────────────────────────

describe('ApiChannelPlatformAdapter.doSend', () => {
    it('delivers the reply to the callback URL signed with the account secret', async () => {
        const { adapter, callbackService } = makeAdapter();
        const account = makeAccount();

        const result = await adapter.sendMessage(
            account,
            'user-9',
            textMsg('hi there')
        );

        expect(result.externalId).toEqual(expect.any(String));
        expect(callbackService.deliver).toHaveBeenCalledTimes(1);

        const [calledAccount, payload] = (
            callbackService.deliver as jest.Mock
        ).mock.calls[0];
        expect(calledAccount).toBe(account);
        expect(payload).toMatchObject({
            senderId: 'user-9',
            externalId: result.externalId,
            text: 'hi there',
        });
    });

    it('does not throw when the callback fails — retries in-process instead', async () => {
        const { adapter, callbackService } = makeAdapter();
        (callbackService.deliver as jest.Mock).mockRejectedValue(
            new Error('receiver down')
        );

        await expect(
            adapter.sendMessage(makeAccount(), 'user-9', textMsg('hi'))
        ).resolves.toMatchObject({ externalId: expect.any(String) });
    });

    describe('in-process retry', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('re-reads the account and retries with backoff until delivery succeeds', async () => {
            const { adapter, callbackService, accountService } =
                makeAdapter();
            const account = makeAccount();
            accountService.findOne.mockResolvedValue(account);
            (callbackService.deliver as jest.Mock)
                .mockRejectedValueOnce(new Error('receiver down'))
                .mockResolvedValueOnce(undefined);

            await adapter.sendMessage(account, 'user-9', textMsg('hi'));
            expect(callbackService.deliver).toHaveBeenCalledTimes(1);

            await jest.advanceTimersByTimeAsync(5000);

            expect(accountService.findOne).toHaveBeenCalledWith({
                id: account.id,
            });
            expect(callbackService.deliver).toHaveBeenCalledTimes(2);
        });

        it('drops the retry when the account no longer exists', async () => {
            const { adapter, callbackService, accountService } =
                makeAdapter();
            const account = makeAccount();
            accountService.findOne.mockResolvedValue(null);
            (callbackService.deliver as jest.Mock).mockRejectedValue(
                new Error('receiver down')
            );

            await adapter.sendMessage(account, 'user-9', textMsg('hi'));
            await jest.advanceTimersByTimeAsync(5000);

            expect(callbackService.deliver).toHaveBeenCalledTimes(1);
        });

        it('logs a final error after exhausting all attempts', async () => {
            const errorSpy = jest
                .spyOn(Logger.prototype, 'error')
                .mockImplementation(() => undefined);
            const { adapter, callbackService, accountService } =
                makeAdapter();
            const account = makeAccount();
            accountService.findOne.mockResolvedValue(account);
            (callbackService.deliver as jest.Mock).mockRejectedValue(
                new Error('receiver down')
            );

            await adapter.sendMessage(account, 'user-9', textMsg('hi'));
            // 4 retries at 5s/10s/20s/40s = 75s total backoff.
            await jest.advanceTimersByTimeAsync(75_000);

            expect(callbackService.deliver).toHaveBeenCalledTimes(5);
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('exhausted all 5 attempts')
            );

            errorSpy.mockRestore();
        });

        it('does not schedule a retry when the first attempt is blocked by the egress guard', async () => {
            const { adapter, callbackService, accountService } =
                makeAdapter();
            const account = makeAccount();
            (callbackService.deliver as jest.Mock).mockRejectedValue(
                new EgressBlockedError('Egress blocked: host is not allowed')
            );

            await adapter.sendMessage(account, 'user-9', textMsg('hi'));
            await jest.advanceTimersByTimeAsync(75_000);

            expect(callbackService.deliver).toHaveBeenCalledTimes(1);
            expect(accountService.findOne).not.toHaveBeenCalled();
        });

        it('stops retrying immediately once a later attempt is blocked by the egress guard', async () => {
            const errorSpy = jest
                .spyOn(Logger.prototype, 'error')
                .mockImplementation(() => undefined);
            const { adapter, callbackService, accountService } =
                makeAdapter();
            const account = makeAccount();
            accountService.findOne.mockResolvedValue(account);
            (callbackService.deliver as jest.Mock)
                .mockRejectedValueOnce(new Error('receiver down'))
                .mockRejectedValueOnce(
                    new EgressBlockedError(
                        'Egress blocked: host is not allowed'
                    )
                );

            await adapter.sendMessage(account, 'user-9', textMsg('hi'));
            // First retry at 5s hits the block; a non-blocked run would still
            // have attempts left at 10s/20s/40s.
            await jest.advanceTimersByTimeAsync(75_000);

            expect(callbackService.deliver).toHaveBeenCalledTimes(2);
            errorSpy.mockRestore();
        });
    });

    it('throws when the account has no callback URL configured', async () => {
        const { adapter } = makeAdapter();
        const account = makeAccount({ config: undefined });

        await expect(
            adapter.sendMessage(account, 'user-9', textMsg('hi'))
        ).rejects.toThrow();
    });

    it('degrades a card to text because the channel declares no card support', async () => {
        const { adapter, callbackService } = makeAdapter();

        await adapter.sendMessage(makeAccount(), 'user-9', {
            content: { kind: 'card', card: { title: 'A card' } },
            fallbackText: 'A card',
        });

        const [, payload] = (callbackService.deliver as jest.Mock).mock
            .calls[0];
        expect(payload.text).toBe('A card');
    });
});
