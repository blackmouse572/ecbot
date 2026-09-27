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
            await expect(
                controller.cancel('f-1', '')
            ).rejects.toBeInstanceOf(BadRequestException);
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
});
