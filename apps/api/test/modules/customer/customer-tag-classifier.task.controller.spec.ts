import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CustomerTagClassifierTaskController } from '../../../src/modules/customer/controllers/customer-tag-classifier.task.controller';
import { CustomerTagClassifierTaskDto } from '../../../src/modules/customer/dtos/customer-tag-classifier.task.dto';
import { ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS } from '../../../src/modules/customer/constants/customer-tag-classifier.constant';

describe('CustomerTagClassifierTaskController', () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    let controller: CustomerTagClassifierTaskController;

    const dto = {
        jobName: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
        conversationId: 'conv-1',
        snapshotKey: '2026-06-15T12:00:00.000Z:RESOLVED',
    };

    beforeEach(() => {
        handle.mockReset();
        handle.mockResolvedValue(undefined);
        controller = new CustomerTagClassifierTaskController({ handle } as any);
    });

    it('dispatches CLASSIFY with the Cloud Tasks retry count', async () => {
        await expect(
            controller.handle(dto as any, {
                'x-cloudtasks-taskretrycount': '2',
            })
        ).resolves.toEqual({});
        expect(handle).toHaveBeenCalledWith(dto, 2);
    });

    it.each([undefined, 'not-a-number', '-1', '1.5', ''])(
        'normalizes invalid retry count %p to zero',
        async retryCount => {
            await controller.handle(dto as any, {
                'x-cloudtasks-taskretrycount': retryCount as string,
            });

            expect(handle).toHaveBeenCalledWith(dto, 0);
        }
    );

    it('propagates handler failures so Cloud Tasks retries', async () => {
        const error = new Error('classifier failed');
        handle.mockRejectedValueOnce(error);

        await expect(controller.handle(dto as any, {})).rejects.toBe(error);
    });

    it('validates every required payload field with production skipUndefined behavior', async () => {
        await expect(
            validate(plainToInstance(CustomerTagClassifierTaskDto, dto), {
                skipUndefinedProperties: true,
            })
        ).resolves.toHaveLength(0);

        for (const payload of [
            {},
            { conversationId: 'conv-1', snapshotKey: dto.snapshotKey },
            { jobName: dto.jobName, snapshotKey: dto.snapshotKey },
            { jobName: dto.jobName, conversationId: 'conv-1' },
            {
                jobName: 'unknown',
                conversationId: 'conv-1',
                snapshotKey: 'key',
            },
            { jobName: dto.jobName, conversationId: '', snapshotKey: 'key' },
        ]) {
            await expect(
                validate(
                    plainToInstance(CustomerTagClassifierTaskDto, payload),
                    {
                        skipUndefinedProperties: true,
                    }
                )
            ).resolves.toEqual(expect.arrayContaining([expect.any(Object)]));
        }
    });
});
