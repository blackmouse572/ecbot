import { ConflictException, NotFoundException } from '@nestjs/common';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { KnowledgeItemAdminController } from 'src/modules/knowledge-base/controllers/knowledge-item.admin.controller';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from 'src/modules/knowledge-base/enums/knowledge-base-item-status.enum';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';

describe('KnowledgeItemAdminController', () => {
    const knowledgeItemAdminService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOneById: jest.fn(),
        findEntityById: jest.fn(),
    };
    const knowledgeItemService = {
        softDelete: jest.fn(),
        updateStatus: jest.fn(),
    };
    const knowledgeIngestService = { enqueue: jest.fn() };
    const activityService = { createByAdminWithWorkspace: jest.fn() };
    const transactionEm = { name: 'transaction' };
    const em = {
        transactional: jest.fn(async (work: (em: any) => any) =>
            work(transactionEm)
        ),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(3) };
    const controller = new KnowledgeItemAdminController(
        knowledgeItemAdminService as any,
        knowledgeItemService as any,
        knowledgeIngestService as any,
        paginationService as any,
        activityService as any,
        em as any
    );

    const owner = { id: 'owner-1' };
    const workspace = { id: 'w1', owner };
    const entity = (status = ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED) => ({
        id: 'i1',
        title: 'Menu',
        status,
        knowledgeBase: { id: 'kb1', workspace },
    });
    const admin = { user: 'admin-1' } as any;

    beforeEach(() => jest.clearAllMocks());

    it('lists items across workspaces with every filter, paged', async () => {
        const rows = [{ id: 'i1' }];
        knowledgeItemAdminService.findAll.mockResolvedValue(rows);
        knowledgeItemAdminService.getTotal.mockResolvedValue(41);
        const search = { $or: [{ title: /menu/i }] };
        const find = {
            ...search,
            knowledgeBase: { workspace: { $eq: 'w1' } },
            chatbot: { $eq: 'c1' },
            type: { $in: ['FILE'] },
            status: { $in: ['FAILED'] },
        };

        const result = await controller.list(
            {
                _search: search,
                _limit: 20,
                _offset: 20,
                _order: { createdAt: 'desc' },
            } as any,
            { knowledgeBase: { workspace: { $eq: 'w1' } } },
            { chatbot: { $eq: 'c1' } },
            { type: { $in: ['FILE'] } },
            { status: { $in: ['FAILED'] } }
        );

        expect(knowledgeItemAdminService.findAll).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 20,
            order: { createdAt: 'desc' },
        });
        expect(knowledgeItemAdminService.getTotal).toHaveBeenCalledWith(find);
        expect(result).toEqual({
            _pagination: { total: 41, totalPage: 3 },
            data: rows,
        });
    });

    it('returns one item', async () => {
        knowledgeItemAdminService.findOneById.mockResolvedValue({ id: 'i1' });

        await expect(controller.get('i1')).resolves.toEqual({
            data: { id: 'i1' },
        });
    });

    it('answers 404 for an unknown item', async () => {
        knowledgeItemAdminService.findOneById.mockResolvedValue(null);

        await expect(controller.get('nope')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });

    describe('delete', () => {
        it('soft deletes through the shared service and logs it on the owner, in one transaction', async () => {
            knowledgeItemAdminService.findEntityById.mockResolvedValue(
                entity()
            );

            await controller.delete('i1', admin);

            expect(knowledgeItemService.softDelete).toHaveBeenCalledWith('i1', {
                em: transactionEm,
                actionBy: 'admin-1',
            });
            expect(
                activityService.createByAdminWithWorkspace
            ).toHaveBeenCalledWith(
                owner,
                'admin-1',
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: { id: 'i1', name: 'Menu' },
                },
                { em: transactionEm }
            );
        });

        it('answers 404 for an unknown item', async () => {
            knowledgeItemAdminService.findEntityById.mockResolvedValue(null);

            await expect(
                controller.delete('nope', admin)
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(knowledgeItemService.softDelete).not.toHaveBeenCalled();
        });
    });

    describe('reprocess', () => {
        it('queues the item again like the workspace flow and logs it on the owner', async () => {
            knowledgeItemAdminService.findEntityById.mockResolvedValue(
                entity(ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED)
            );

            await controller.reprocess('i1', admin);

            expect(knowledgeItemService.updateStatus).toHaveBeenCalledWith(
                'i1',
                {
                    status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.READY,
                    errorMessage: null,
                }
            );
            expect(knowledgeIngestService.enqueue).toHaveBeenCalledWith('i1');
            expect(
                activityService.createByAdminWithWorkspace
            ).toHaveBeenCalledWith(owner, 'admin-1', workspace, {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                metadata: { id: 'i1', name: 'Menu' },
            });
        });

        it('refuses an item that is already processing', async () => {
            knowledgeItemAdminService.findEntityById.mockResolvedValue(
                entity(ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING)
            );

            await expect(
                controller.reprocess('i1', admin)
            ).rejects.toBeInstanceOf(ConflictException);
            expect(knowledgeItemService.updateStatus).not.toHaveBeenCalled();
            expect(knowledgeIngestService.enqueue).not.toHaveBeenCalled();
        });

        it('answers 404 for an unknown item', async () => {
            knowledgeItemAdminService.findEntityById.mockResolvedValue(null);

            await expect(
                controller.reprocess('nope', admin)
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
