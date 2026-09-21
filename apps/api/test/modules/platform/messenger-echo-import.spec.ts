import { MessengerPlatformAdapter } from '../../../src/modules/platform/adapters/messenger/messenger.platform-adapter';

const OUR_APP_ID = '607269115734707';

const config = {
    get: (k: string) =>
        k === 'facebook.appSecret'
            ? 'sekret'
            : k === 'facebook.graphApiVersion'
              ? 'v23.0'
              : k === 'facebook.appId'
                ? OUR_APP_ID
                : undefined,
};

function makeAdapter(http: any) {
    return new MessengerPlatformAdapter(
        config as any,
        http as any,
        {
            decryptToken: () => 'TOKEN',
        } as any
    );
}

const PAGE = 'page-1';
const CUSTOMER = 'customer-1';

/**
 * Messages the page sends reached the DB only when our own bot wrote them at
 * send time. An operator typing in Facebook's Page Inbox arrives as a
 * message_echoes webhook, and history arrives through reconcile() — both used
 * to be discarded, so an imported thread showed the customer's half only.
 */
describe('MessengerPlatformAdapter — page-authored messages', () => {
    describe('parse()', () => {
        it('marks an echo and reports the customer as senderId', () => {
            const adapter = makeAdapter({ axiosRef: {} });

            const [event] = adapter.parse(
                JSON.stringify({
                    object: 'page',
                    entry: [
                        {
                            id: PAGE,
                            time: 1,
                            messaging: [
                                {
                                    sender: { id: PAGE },
                                    recipient: { id: CUSTOMER },
                                    timestamp: 1788000000000,
                                    message: {
                                        mid: 'm_echo_1',
                                        text: 'operator reply',
                                        is_echo: true,
                                    },
                                },
                            ],
                        },
                    ],
                })
            );

            expect(event.kind).toBe('echo');
            // Conversations are keyed by the customer, so senderId has to be
            // the customer on an echo too — the raw payload has it as
            // recipient because the page is the one sending.
            expect(event.senderId).toBe(CUSTOMER);
            expect(event.recipientId).toBe(PAGE);
            expect(event.text).toBe('operator reply');
        });

        it('flags an echo from our own app so our replies are not re-imported', () => {
            const adapter = makeAdapter({ axiosRef: {} });

            const [event] = adapter.parse(
                JSON.stringify({
                    object: 'page',
                    entry: [
                        {
                            id: PAGE,
                            time: 1,
                            messaging: [
                                {
                                    sender: { id: PAGE },
                                    recipient: { id: CUSTOMER },
                                    timestamp: 1788000000000,
                                    message: {
                                        mid: 'm_echo_2',
                                        text: 'bot reply',
                                        is_echo: true,
                                        app_id: 607269115734707,
                                    },
                                },
                            ],
                        },
                    ],
                })
            );

            expect(event.kind).toBe('echo');
            expect(event.sentByUs).toBe(true);
        });
        it('treats an echo from another app as an operator message', () => {
            // Meta Business Suite sends through its own app id. Skipping on
            // "an app sent this" dropped exactly the hand-typed operator
            // replies this import exists to capture.
            const adapter = makeAdapter({ axiosRef: {} });

            const [event] = adapter.parse(
                JSON.stringify({
                    object: 'page',
                    entry: [
                        {
                            id: PAGE,
                            time: 1,
                            messaging: [
                                {
                                    sender: { id: PAGE },
                                    recipient: { id: CUSTOMER },
                                    timestamp: 1788000000000,
                                    message: {
                                        mid: 'm_echo_3',
                                        text: 'typed in Business Suite',
                                        is_echo: true,
                                        app_id: 123456789,
                                    },
                                },
                            ],
                        },
                    ],
                })
            );

            expect(event.kind).toBe('echo');
            expect(event.sentByUs).toBe(false);
        });
    });

    describe('reconcile()', () => {
        it('emits page-authored messages as echoes instead of dropping them', async () => {
            const account: any = { id: 'acc-1', externalId: PAGE };
            const http = {
                axiosRef: {
                    get: jest.fn(async (url: string) => {
                        if (url.endsWith('/me/conversations')) {
                            return { data: { data: [{ id: 't_1' }] } };
                        }
                        return {
                            data: {
                                messages: {
                                    data: [
                                        {
                                            id: 'm_from_customer',
                                            message: 'hello',
                                            created_time:
                                                '2026-09-08T10:00:00+0000',
                                            from: { id: CUSTOMER },
                                            to: { data: [{ id: PAGE }] },
                                        },
                                        {
                                            id: 'm_from_page',
                                            message: 'how can I help?',
                                            created_time:
                                                '2026-09-08T10:01:00+0000',
                                            from: { id: PAGE },
                                            to: { data: [{ id: CUSTOMER }] },
                                        },
                                    ],
                                },
                            },
                        };
                    }),
                },
            };

            const events = await makeAdapter(http).reconcile(
                account,
                new Date('2026-09-08T09:00:00Z')
            );

            expect(events).toHaveLength(2);

            const inbound = events.find(
                e => e.externalMessageId === 'm_from_customer'
            );
            expect(inbound?.kind).toBe('message');
            expect(inbound?.senderId).toBe(CUSTOMER);

            const outbound = events.find(
                e => e.externalMessageId === 'm_from_page'
            );
            expect(outbound?.kind).toBe('echo');
            // Same normalisation as parse(): the customer, not the page.
            expect(outbound?.senderId).toBe(CUSTOMER);
            expect(outbound?.text).toBe('how can I help?');
        });
    });
});
