import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InboundEventTaskController } from '../../../src/modules/platform/controllers/inbound-event.task.controller';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_QUEUE,
} from '../../../src/modules/platform/constants/inbound-event.constant';
import { InboundEventTaskDto } from '../../../src/modules/platform/dtos/inbound-event.task.dto';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ApiKeyXApiKeyCloudTasksGuard } from '../../../src/modules/api-key/guards/x-api-key/api-key.x-api-key.cloud-tasks.guard';
import { REQUEST_VALIDATION_PIPE_OPTIONS } from '../../../src/common/request/constants/request.constant';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '../../../src/common/request/constants/request.constant';

// The body CloudTasksQueueClient.enqueue() builds: { jobName, ...payload },
// after a JSON round-trip (dates arrive as strings, as they did from BullMQ).
const body = {
    jobName: ENUM_INBOUND_EVENT_PROCESS.INGEST,
    event: {
        kind: 'message',
        accountKey: 'page-1',
        senderId: 'sender-1',
        recipientId: 'page-1',
        text: 'hi',
        externalMessageId: 'mid-1',
        timestamp: '2026-06-18T00:00:00.000Z',
        raw: { entry: [{ id: 'page-1' }] },
        attachments: [{ type: 'image', url: 'https://x/y.png' }],
    },
};

describe('InboundEventTaskController', () => {
    const processor = { process: jest.fn() };
    let controller: InboundEventTaskController;

    beforeEach(() => {
        jest.clearAllMocks();
        processor.process.mockResolvedValue(undefined);
        controller = new InboundEventTaskController(processor as any);
    });

    it('runs the Turn pipeline for an INGEST task', async () => {
        await expect(controller.handle(body as any)).resolves.toEqual({});
        expect(processor.process).toHaveBeenCalledWith(body.event);
    });

    it('propagates a failed Turn so Cloud Tasks retries the task', async () => {
        const error = new Error('turn failed');
        processor.process.mockRejectedValue(error);

        await expect(controller.handle(body as any)).rejects.toBe(error);
    });

    it('mounts on the path CloudTasksQueueClient targets for the inbound queue', () => {
        expect(
            Reflect.getMetadata(
                'path',
                InboundEventTaskController.prototype.handle
            )
        ).toBe(`/${INBOUND_EVENT_QUEUE}`);
    });

    it('accepts only the Cloud Tasks key, not any SYSTEM key', () => {
        const guards = Reflect.getMetadata(
            GUARDS_METADATA,
            InboundEventTaskController.prototype.handle
        );

        expect(guards).toContain(ApiKeyXApiKeyCloudTasksGuard);
    });

    it('allows the Turn the same time budget as other AI task callbacks', () => {
        const handler = InboundEventTaskController.prototype.handle;

        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, handler)
        ).toBe(true);
        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, handler)
        ).toBe('300s');
    });

    it('accepts the real task body under production validation options', async () => {
        const dto = plainToInstance(InboundEventTaskDto, body);
        const errors = await validate(dto, {
            whitelist: REQUEST_VALIDATION_PIPE_OPTIONS.whitelist,
            forbidNonWhitelisted:
                REQUEST_VALIDATION_PIPE_OPTIONS.forbidNonWhitelisted,
            forbidUnknownValues:
                REQUEST_VALIDATION_PIPE_OPTIONS.forbidUnknownValues,
        });

        expect(errors).toEqual([]);
        // whitelist must not strip the nested event.
        expect(dto.event).toEqual(body.event);
    });

    it('rejects a body without an event or with an unknown jobName', async () => {
        for (const payload of [
            { jobName: ENUM_INBOUND_EVENT_PROCESS.INGEST },
            { jobName: 'other', event: body.event },
        ]) {
            const errors = await validate(
                plainToInstance(InboundEventTaskDto, payload),
                { forbidUnknownValues: true }
            );
            expect(errors.length).toBeGreaterThan(0);
        }
    });
});
