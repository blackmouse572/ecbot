import { BadRequestException } from '@nestjs/common';
import { FollowupSystemController } from '../../../src/modules/platform/controllers/followup.system.controller';

// Unit-level controller spec. This is the back-channel apps/ai calls over the
// SYSTEM api key (@ApiKeySystemProtected) — no workspace/JWT scoping exists
// here, so the DELETE handler itself must require & forward `conversationId`
// to keep cancellation scoped to the caller's own conversation.

const mockFollowupService = {
    schedule: jest.fn(),
    findScheduledByConversation: jest.fn(),
    mapPending: jest.fn(),
    cancel: jest.fn(),
};

function buildController(): FollowupSystemController {
    return new FollowupSystemController(mockFollowupService as any);
}

describe('FollowupSystemController', () => {
    let controller: FollowupSystemController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
    });

    describe('DELETE /system/followups/:id', () => {
        it('rejects with a 400 when the conversationId query is missing', async () => {
            await expect(
                controller.cancel('f-1', undefined as any)
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(mockFollowupService.cancel).not.toHaveBeenCalled();
        });

        it('rejects with a 400 when the conversationId query is empty', async () => {
            await expect(controller.cancel('f-1', '')).rejects.toBeInstanceOf(
                BadRequestException
            );
            expect(mockFollowupService.cancel).not.toHaveBeenCalled();
        });

        it('delegates to service.cancel scoped to the conversation', async () => {
            mockFollowupService.cancel.mockResolvedValue(true);

            const result = await controller.cancel('f-1', 'conv-1');

            expect(mockFollowupService.cancel).toHaveBeenCalledWith(
                'f-1',
                'conv-1'
            );
            expect(result).toEqual({ cancelled: true });
        });

        it('returns cancelled: false when the service could not cancel it', async () => {
            mockFollowupService.cancel.mockResolvedValue(false);

            const result = await controller.cancel('f-1', 'conv-1');

            expect(result).toEqual({ cancelled: false });
        });
    });
    describe('POST /system/followups', () => {
        const base = {
            conversationId: 'conv-1',
            chatbotId: 'cb-1',
            userId: 'psid-1',
            providerId: 'acc-1',
            prompt: 'check payment',
            reason: 'payment_check',
        };

        it('passes a delay through as delayMinutes', async () => {
            mockFollowupService.schedule.mockResolvedValue('f-1');

            await controller.schedule({ ...base, delayMinutes: 30 } as any);

            expect(mockFollowupService.schedule).toHaveBeenCalledWith(
                expect.objectContaining({ conversationId: 'conv-1' }),
                { delayMinutes: 30 }
            );
        });

        it('passes a wall-clock time through as at', async () => {
            mockFollowupService.schedule.mockResolvedValue('f-1');

            const result = await controller.schedule({
                ...base,
                at: '2026-10-14T09:00',
            } as any);

            expect(mockFollowupService.schedule).toHaveBeenCalledWith(
                expect.anything(),
                { at: '2026-10-14T09:00' }
            );
            expect(result).toEqual({ followupId: 'f-1' });
        });

        it('rejects a body that sends both delayMinutes and at', async () => {
            await expect(
                controller.schedule({
                    ...base,
                    delayMinutes: 30,
                    at: '2026-10-14T09:00',
                } as any)
            ).rejects.toThrow('followup.schedule.error.atAndDelay');
            expect(mockFollowupService.schedule).not.toHaveBeenCalled();
        });
    });
});
