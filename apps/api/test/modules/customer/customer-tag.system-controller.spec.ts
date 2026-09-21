import { NotFoundException } from '@nestjs/common';
import { CustomerTagSystemController } from '../../../src/modules/customer/controllers/customer-tag.system.controller';

describe('CustomerTagSystemController (#174)', () => {
    const mockCustomerRepository = {
        findOneById: jest.fn(),
    };
    const mockCustomerTagService = {
        findOneByWorkspaceAndName: jest.fn(),
    };
    const mockCustomerTagAssignmentService = {
        apply: jest.fn(),
        remove: jest.fn(),
    };
    const mockConversationService = {
        triggerHandoff: jest.fn(),
    };
    const mockConversationRepository = {
        findOneById: jest.fn(),
    };

    let controller: CustomerTagSystemController;

    const customer = {
        id: 'cust-1',
        workspace: { id: 'ws-1' },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new CustomerTagSystemController(
            mockCustomerRepository as any,
            mockCustomerTagService as any,
            mockCustomerTagAssignmentService as any,
            mockConversationService as any,
            mockConversationRepository as any
        );
        mockCustomerRepository.findOneById.mockResolvedValue(customer);
    });

    describe('POST /apply with a non-handoff tag', () => {
        it('assigns the tag, returns triggeredHandoff=false, and never calls triggerHandoff', async () => {
            mockCustomerTagService.findOneByWorkspaceAndName.mockResolvedValue({
                id: 'tag-vip',
                name: 'VIP',
                triggersHandoff: false,
            });
            mockCustomerTagAssignmentService.apply.mockResolvedValue(undefined);

            const result = await controller.apply('cust-1', {
                tagName: 'VIP',
                conversationId: 'conv-1',
            } as any);

            expect(
                mockCustomerTagService.findOneByWorkspaceAndName
            ).toHaveBeenCalledWith('ws-1', 'VIP');
            expect(mockCustomerTagAssignmentService.apply).toHaveBeenCalledWith(
                'cust-1',
                'tag-vip'
            );
            expect(
                mockConversationService.triggerHandoff
            ).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true, triggeredHandoff: false });
        });
    });

    describe('POST /apply with a triggersHandoff=true tag', () => {
        it('assigns the tag AND calls triggerHandoff with (conversation, workspaceId, "tag_trigger", chatbot.handoffMessage)', async () => {
            mockCustomerTagService.findOneByWorkspaceAndName.mockResolvedValue({
                id: 'tag-handoff',
                name: 'Needs human',
                triggersHandoff: true,
            });
            const conversation = {
                id: 'conv-1',
                chatbot: { handoffMessage: 'A human will jump in shortly.' },
            };
            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockCustomerTagAssignmentService.apply.mockResolvedValue(undefined);

            const result = await controller.apply('cust-1', {
                tagName: 'Needs human',
                conversationId: 'conv-1',
            } as any);

            expect(mockCustomerTagAssignmentService.apply).toHaveBeenCalledWith(
                'cust-1',
                'tag-handoff'
            );
            expect(mockConversationService.triggerHandoff).toHaveBeenCalledWith(
                conversation,
                'ws-1',
                'tag_trigger',
                'A human will jump in shortly.'
            );
            expect(result).toEqual({ ok: true, triggeredHandoff: true });
        });
    });

    describe('POST /apply with an unknown tag name', () => {
        it('throws NotFoundException (404, not 500)', async () => {
            mockCustomerTagService.findOneByWorkspaceAndName.mockResolvedValue(
                null
            );

            await expect(
                controller.apply('cust-1', {
                    tagName: 'No-such-tag',
                    conversationId: 'conv-1',
                } as any)
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(
                mockCustomerTagAssignmentService.apply
            ).not.toHaveBeenCalled();
            expect(
                mockConversationService.triggerHandoff
            ).not.toHaveBeenCalled();
        });
    });

    describe('POST /remove', () => {
        it('delegates to assignment.remove(customerId, tag.id) and returns ok', async () => {
            mockCustomerTagService.findOneByWorkspaceAndName.mockResolvedValue({
                id: 'tag-vip',
                name: 'VIP',
                triggersHandoff: false,
            });
            mockCustomerTagAssignmentService.remove.mockResolvedValue(
                undefined
            );

            const result = await controller.remove('cust-1', {
                tagName: 'VIP',
            } as any);

            expect(
                mockCustomerTagAssignmentService.remove
            ).toHaveBeenCalledWith('cust-1', 'tag-vip');
            expect(result).toEqual({ ok: true });
        });

        it('is idempotent — unknown tag name is a no-op (returns ok, does not throw)', async () => {
            mockCustomerTagService.findOneByWorkspaceAndName.mockResolvedValue(
                null
            );

            const result = await controller.remove('cust-1', {
                tagName: 'gone',
            } as any);

            expect(
                mockCustomerTagAssignmentService.remove
            ).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });
    });
});
