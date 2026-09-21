import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FollowupTaskController } from '../../../src/modules/platform/controllers/followup.task.controller';
import { ENUM_FOLLOWUP_PROCESS } from '../../../src/modules/platform/constants/followup.constant';
import { FollowupTaskDto } from '../../../src/modules/platform/dtos/followup.task.dto';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '../../../src/common/request/constants/request.constant';

describe('FollowupTaskController', () => {
    it('dispatches the FIRE task to FollowupService.fire', async () => {
        const followupService = {
            fire: jest.fn().mockResolvedValue(undefined),
        };
        const controller = new FollowupTaskController(followupService as any);
        const dto = {
            jobName: ENUM_FOLLOWUP_PROCESS.FIRE,
            conversationId: 'conv-1',
            chatbotId: 'cb-1',
            userId: 'user-1',
            providerId: 'provider-1',
            customerId: 'customer-1',
            contactPointId: 'contact-1',
            prompt: 'follow up',
            reason: 'payment_check',
        } as any;

        await expect(controller.handle(dto)).resolves.toEqual({});
        expect(followupService.fire).toHaveBeenCalledWith(dto);
    });

    it('propagates errors from the task handler', async () => {
        const error = new Error('fire failed');
        const followupService = { fire: jest.fn().mockRejectedValue(error) };
        const controller = new FollowupTaskController(followupService as any);

        await expect(
            controller.handle({ jobName: ENUM_FOLLOWUP_PROCESS.FIRE } as any)
        ).rejects.toBe(error);
    });

    it('allows normal AI delivery time on the Cloud Tasks callback', () => {
        const handler = FollowupTaskController.prototype.handle;

        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, handler)
        ).toBe(true);
        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, handler)
        ).toBe('300s');
    });

    it('rejects missing required fields with production validation options', async () => {
        for (const payload of [
            {},
            { jobName: ENUM_FOLLOWUP_PROCESS.FIRE },
            {
                jobName: ENUM_FOLLOWUP_PROCESS.FIRE,
                conversationId: 'conv-1',
                chatbotId: 'cb-1',
                userId: 'user-1',
                providerId: 'provider-1',
                customerId: 'customer-1',
                contactPointId: 'contact-1',
                prompt: 'follow up',
            },
        ]) {
            await expect(
                validate(plainToInstance(FollowupTaskDto, payload), {
                    skipUndefinedProperties: true,
                    forbidUnknownValues: true,
                })
            ).resolves.toEqual(expect.arrayContaining([expect.any(Object)]));
        }
    });
});
