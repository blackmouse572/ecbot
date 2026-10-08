import { UnprocessableEntityException } from '@nestjs/common';
import { KnowledgeItemWorkspaceController } from '@app/modules/knowledge-base/controllers/knowledge-item.workspace.controller';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '@app/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';

// A FILE item sent without a file used to be created (201) and only failed
// later at ingest (#162). It is a request error, so it is refused up front.
describe('KnowledgeItemWorkspaceController.create', () => {
    let controller: KnowledgeItemWorkspaceController;
    let em: { fork: jest.Mock };
    let knowledgeItemService: { create: jest.Mock };
    let knowledgeStorageQuotaService: { assertCanStore: jest.Mock };

    const user = { id: 'user-1' } as any;
    const workspace = { id: 'workspace-1' } as any;

    beforeEach(() => {
        em = { fork: jest.fn() };
        knowledgeItemService = { create: jest.fn() };
        knowledgeStorageQuotaService = { assertCanStore: jest.fn() };
        controller = new KnowledgeItemWorkspaceController(
            em as any,
            knowledgeItemService as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            knowledgeStorageQuotaService as any
        );
    });

    it('refuses a file that would pass the plan storage limit, before saving anything', async () => {
        const refusal = new UnprocessableEntityException({
            message: 'knowledgeItem.error.storageLimitExceeded',
        });
        knowledgeStorageQuotaService.assertCanStore.mockRejectedValue(refusal);

        const result = controller.create(
            user,
            workspace,
            'kb-1',
            { type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE, title: 'x' } as any,
            { size: 1234 } as any
        );

        await expect(result).rejects.toBe(refusal);
        expect(
            knowledgeStorageQuotaService.assertCanStore
        ).toHaveBeenCalledWith('workspace-1', 1234);
        expect(em.fork).not.toHaveBeenCalled();
    });

    it('refuses a FILE item with no file attached (422)', async () => {
        const result = controller.create(
            user,
            workspace,
            'kb-1',
            { type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE, title: 'x' } as any,
            undefined
        );

        await expect(result).rejects.toBeInstanceOf(
            UnprocessableEntityException
        );
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                message: 'knowledgeItem.error.fileRequired',
            },
        });
        expect(em.fork).not.toHaveBeenCalled();
        expect(knowledgeItemService.create).not.toHaveBeenCalled();
    });
});
