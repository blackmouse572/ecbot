import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AccountService } from '@app/modules/account/services/account.service';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { MessengerPlatformAdapter } from '../../../src/modules/platform/adapters/messenger/messenger.platform-adapter';

describe('MessengerPlatformAdapter.reconcile', () => {
    let adapter: MessengerPlatformAdapter;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                MessengerPlatformAdapter,
                {
                    provide: HttpService,
                    useValue: { axiosRef: { get: jest.fn() } },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-value'),
                    },
                },
                {
                    provide: AccountService,
                    useValue: { decryptToken: () => 'test-token' },
                },
            ],
        }).compile();
        adapter = module.get(MessengerPlatformAdapter);
    });

    const makeAccount = (externalId = 'page-123'): AccountEntity =>
        ({
            id: 'acct-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            externalId,
        }) as AccountEntity;

    const makeRawMsg = (
        id: string,
        fromId: string,
        createdTime: string,
        message = 'hello'
    ) => ({ id, from: { id: fromId }, created_time: createdTime, message });

    it('returns PlatformWebhookEvents for messages within lookback window', async () => {
        const lookback = new Date('2026-01-01T00:00:00Z');
        const httpGetSpy = jest.spyOn(adapter as any, 'httpGet');

        // First call: conversation list
        httpGetSpy.mockResolvedValueOnce({ data: [{ id: 'conv-1' }] });
        // Second call: conversation with messages (since filter applied by Graph API)
        httpGetSpy.mockResolvedValueOnce({
            messages: {
                data: [
                    makeRawMsg('msg-new', 'user-psid', '2026-01-02T00:00:00Z'),
                ],
            },
        });

        const events = await adapter.reconcile(makeAccount(), lookback);

        expect(events).toHaveLength(1);
        expect(events[0].externalMessageId).toBe('msg-new');
        expect(events[0].senderId).toBe('user-psid');
        expect(events[0].accountKey).toBe('page-123');
        expect(events[0].kind).toBe('message');

        // Verify the second httpGet used the correct since timestamp
        const secondCall = httpGetSpy.mock.calls[1] as [
            string,
            Record<string, string>,
        ];
        const sinceMatch = secondCall[1].fields?.match(
            /messages\.since\((\d+)\)/
        );
        expect(sinceMatch).not.toBeNull();
        expect(parseInt(sinceMatch![1], 10)).toBe(
            Math.floor(lookback.getTime() / 1000)
        );
    });

    it('skips a conversation that throws and continues', async () => {
        const lookback = new Date('2026-01-01T00:00:00Z');
        const httpGetSpy = jest.spyOn(adapter as any, 'httpGet');

        // Conversation list
        httpGetSpy.mockResolvedValueOnce({
            data: [{ id: 'conv-err' }, { id: 'conv-ok' }],
        });
        // conv-err throws
        httpGetSpy.mockRejectedValueOnce(new Error('API error'));
        // conv-ok returns one message
        httpGetSpy.mockResolvedValueOnce({
            messages: {
                data: [
                    makeRawMsg('msg-1', 'user-1', '2026-01-02T00:00:00Z', 'hi'),
                ],
            },
        });

        const events = await adapter.reconcile(makeAccount(), lookback);

        expect(events).toHaveLength(1);
        expect(events[0].externalMessageId).toBe('msg-1');
    });

    it('returns empty array when no conversations', async () => {
        jest.spyOn(adapter as any, 'httpGet').mockResolvedValueOnce({
            data: [],
        });
        const events = await adapter.reconcile(makeAccount(), new Date());
        expect(events).toEqual([]);
    });

    it('filters out echo messages sent by the page itself', async () => {
        const lookback = new Date('2026-01-01T00:00:00Z');
        const account = makeAccount('page-123');
        const httpGetSpy = jest.spyOn(adapter as any, 'httpGet');

        httpGetSpy.mockResolvedValueOnce({ data: [{ id: 'conv-1' }] });
        httpGetSpy.mockResolvedValueOnce({
            messages: {
                data: [
                    makeRawMsg(
                        'msg-echo',
                        'page-123',
                        '2026-01-02T00:00:00Z',
                        'page reply'
                    ), // echo
                    makeRawMsg(
                        'msg-user',
                        'user-psid',
                        '2026-01-02T01:00:00Z',
                        'user msg'
                    ),
                ],
            },
        });

        const events = await adapter.reconcile(account, lookback);

        expect(events).toHaveLength(1);
        expect(events[0].externalMessageId).toBe('msg-user');
        expect(events[0].senderId).toBe('user-psid');
    });

    it('paginates through multiple conversation pages', async () => {
        const lookback = new Date('2026-01-01T00:00:00Z');

        const httpGetSpy = jest.spyOn(adapter as any, 'httpGet');
        httpGetSpy
            .mockResolvedValueOnce({
                data: [{ id: 'conv-1' }],
                paging: {
                    cursors: { after: 'cursor-abc' },
                    next: 'https://...',
                },
            })
            .mockResolvedValueOnce({
                data: [{ id: 'conv-2' }],
                paging: { cursors: { after: 'cursor-xyz' } }, // no next
            })
            .mockResolvedValueOnce({
                messages: {
                    data: [
                        makeRawMsg(
                            'msg-1',
                            'user-1',
                            '2026-01-02T00:00:00+0000'
                        ),
                    ],
                },
            })
            .mockResolvedValueOnce({
                messages: {
                    data: [
                        makeRawMsg(
                            'msg-2',
                            'user-2',
                            '2026-01-02T00:00:00+0000'
                        ),
                    ],
                },
            });

        const events = await adapter.reconcile(makeAccount(), lookback);

        expect(events).toHaveLength(2);
        // Second conversation-list call should include after= cursor
        const secondCall = httpGetSpy.mock.calls[1][1];
        expect(secondCall).toMatchObject({ after: 'cursor-abc' });
    });

    it('warns when messages hit the 1000 limit', async () => {
        const lookback = new Date('2026-01-01T00:00:00Z');
        const warnSpy = jest.spyOn(adapter['logger'], 'warn');

        const msgs1000 = Array.from({ length: 1000 }, (_, i) =>
            makeRawMsg(
                `msg-${i}`,
                'user-1',
                '2026-01-02T00:00:00+0000',
                `text-${i}`
            )
        );

        jest.spyOn(adapter as any, 'httpGet')
            .mockResolvedValueOnce({
                data: [{ id: 'conv-1' }],
                paging: undefined,
            })
            .mockResolvedValueOnce({ messages: { data: msgs1000 } });

        await adapter.reconcile(makeAccount(), lookback);

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('truncated at 1000')
        );
    });
});
