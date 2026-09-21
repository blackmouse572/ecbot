import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { InboundInboxService } from '../../../src/modules/platform/services/inbound-inbox.service';
import { InboundEventProcessor } from '../../../src/modules/platform/processors/inbound-event.processor';
import { ENUM_INBOUND_EVENT_PROCESS } from '../../../src/modules/platform/constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';
import { ormStub } from '../../helpers/orm-stub';

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

describe('InboundInboxService.accept (ADR-0007 intake seam)', () => {
    const queue = { add: jest.fn() };
    const messageProcessor = { process: jest.fn() };
    let inbox: InboundInboxService;

    beforeEach(() => {
        jest.clearAllMocks();
        inbox = new InboundInboxService(
            queue as any,
            true,
            messageProcessor as any
        );
    });

    it('enqueues the event with a colon-free deterministic jobId for dedup', async () => {
        const result = await inbox.accept(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            baseEvent
        );

        expect(result).toBe('accepted');
        expect(queue.add).toHaveBeenCalledTimes(1);
        const [name, payload, opts] = queue.add.mock.calls[0];
        expect(name).toBe(ENUM_INBOUND_EVENT_PROCESS.INGEST);
        expect(payload).toBe(baseEvent);
        expect(opts.jobId).toBe(`${ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE}-mid-1`);
        expect(opts.jobId).not.toContain(':');
        // Retention keeps the jobId alive so redeliveries dedupe.
        expect(opts.removeOnComplete).toEqual({ age: expect.any(Number) });
    });

    it('ignores events without an externalMessageId (read/delivery/typing)', async () => {
        const readEvent: PlatformWebhookEvent = {
            ...baseEvent,
            kind: 'read',
            externalMessageId: undefined,
        };

        const result = await inbox.accept(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            readEvent
        );

        expect(result).toBe('ignored');
        expect(queue.add).not.toHaveBeenCalled();
    });

    it('propagates enqueue failure so the controller can return 5xx', async () => {
        queue.add.mockRejectedValueOnce(new Error('redis down'));

        await expect(
            inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, baseEvent)
        ).rejects.toThrow('redis down');
    });
});

describe('InboundInboxService.accept — no Redis at boot', () => {
    const queue = { add: jest.fn() };
    const messageProcessor = { process: jest.fn() };
    let inbox: InboundInboxService;

    beforeEach(() => {
        jest.clearAllMocks();
        messageProcessor.process.mockResolvedValue(undefined);
        inbox = new InboundInboxService(
            queue as any,
            false,
            messageProcessor as any
        );
    });

    it('fires the Turn inline instead of enqueueing, without waiting for it', async () => {
        // A never-resolving process() must not block accept() — this is what
        // keeps the webhook response fast even with Redis down.
        messageProcessor.process.mockReturnValue(new Promise(() => {}));

        const result = await inbox.accept(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            baseEvent
        );

        expect(result).toBe('accepted');
        expect(messageProcessor.process).toHaveBeenCalledWith(baseEvent);
        expect(queue.add).not.toHaveBeenCalled();
    });

    it('logs rather than throws when the fire-and-forget Turn rejects', async () => {
        messageProcessor.process.mockRejectedValue(new Error('boom'));

        await expect(
            inbox.accept(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, baseEvent)
        ).resolves.toBe('accepted');

        // Let the unawaited rejection's .catch() handler run.
        await new Promise(process.nextTick);
    });

    it('still ignores events without an externalMessageId', async () => {
        const readEvent: PlatformWebhookEvent = {
            ...baseEvent,
            kind: 'read',
            externalMessageId: undefined,
        };

        const result = await inbox.accept(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            readEvent
        );

        expect(result).toBe('ignored');
        expect(messageProcessor.process).not.toHaveBeenCalled();
    });
});

describe('InboundEventProcessor (ADR-0007 turn seam)', () => {
    const processor = { process: jest.fn() };
    let worker: InboundEventProcessor;

    beforeEach(() => {
        jest.clearAllMocks();
        worker = new InboundEventProcessor(processor as any, ormStub());
    });

    it('delegates an INGEST job to the Turn pipeline', async () => {
        await worker.process({
            name: ENUM_INBOUND_EVENT_PROCESS.INGEST,
            data: baseEvent,
        } as any);

        expect(processor.process).toHaveBeenCalledWith(baseEvent);
    });

    it('skips jobs of an unknown name', async () => {
        await worker.process({ name: 'other', data: baseEvent } as any);

        expect(processor.process).not.toHaveBeenCalled();
    });
});
