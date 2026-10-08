import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { InboundInboxService } from '../../../src/modules/platform/services/inbound-inbox.service';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_QUEUE,
} from '../../../src/modules/platform/constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

const baseEvent: PlatformWebhookEvent = {
    kind: 'message',
    accountKey: 'page-1',
    senderId: 'sender-1',
    recipientId: 'page-1',
    text: 'hi',
    externalMessageId: 'mid-1',
    timestamp: new Date('2026-06-18T00:00:00Z'),
    raw: {},
};

describe('InboundInboxService.accept (Cloud Tasks intake seam)', () => {
    const cloudTasks = { enqueue: jest.fn() };
    const messageProcessor = { process: jest.fn() };
    let inbox: InboundInboxService;

    beforeEach(() => {
        jest.clearAllMocks();
        cloudTasks.enqueue.mockResolvedValue(undefined);
        messageProcessor.process.mockResolvedValue(undefined);
        inbox = new InboundInboxService(
            cloudTasks as any,
            messageProcessor as any
        );
    });

    it('enqueues the event as an INGEST task on the inbound queue', async () => {
        const result = await inbox.accept(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            baseEvent
        );

        expect(result).toBe('accepted');
        expect(cloudTasks.enqueue).toHaveBeenCalledTimes(1);
        const [queue, jobName, payload] = cloudTasks.enqueue.mock.calls[0];
        expect(queue).toBe(INBOUND_EVENT_QUEUE);
        expect(jobName).toBe(ENUM_INBOUND_EVENT_PROCESS.INGEST);
        expect(payload).toEqual({ event: baseEvent });
        expect(messageProcessor.process).not.toHaveBeenCalled();
    });

    it('names the task deterministically from platform + externalMessageId so redeliveries dedupe', async () => {
        await inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, baseEvent);
        await inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, baseEvent);
        await inbox.accept(ENUM_ACCOUNT_TYPE.TELEGRAM_BOT, baseEvent);

        const names = cloudTasks.enqueue.mock.calls.map(
            ([, , , options]) => options.taskName
        );
        expect(names[0]).toBe(names[1]);
        expect(names[2]).not.toBe(names[0]);
    });

    it('produces a task name Cloud Tasks accepts, whatever the platform id contains', async () => {
        await inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            ...baseEvent,
            externalMessageId: 'wamid.HBgL/ab+c==:1',
        });

        const [, , , options] = cloudTasks.enqueue.mock.calls[0];
        expect(options.taskName).toMatch(/^[A-Za-z0-9_-]{1,500}$/);
    });

    it('ignores events without an externalMessageId (read/delivery/typing)', async () => {
        const result = await inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            ...baseEvent,
            kind: 'read',
            externalMessageId: undefined,
        });

        expect(result).toBe('ignored');
        expect(cloudTasks.enqueue).not.toHaveBeenCalled();
        expect(messageProcessor.process).not.toHaveBeenCalled();
    });

    describe('when Cloud Tasks is unreachable', () => {
        beforeEach(() => {
            cloudTasks.enqueue.mockRejectedValue(new Error('UNAVAILABLE'));
        });

        it('falls back to running the Turn inline so the customer still gets a reply', async () => {
            const result = await inbox.accept(
                ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                baseEvent
            );

            expect(result).toBe('accepted');
            expect(messageProcessor.process).toHaveBeenCalledWith(baseEvent);
        });

        it('does not wait for the inline Turn, keeping the webhook ACK fast', async () => {
            messageProcessor.process.mockReturnValue(new Promise(() => {}));

            await expect(
                inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, baseEvent)
            ).resolves.toBe('accepted');
        });

        it('logs rather than throws when the inline Turn rejects', async () => {
            messageProcessor.process.mockRejectedValue(new Error('boom'));

            await expect(
                inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, baseEvent)
            ).resolves.toBe('accepted');

            // Let the unawaited rejection's .catch() handler run.
            await new Promise(process.nextTick);
        });
    });
});
