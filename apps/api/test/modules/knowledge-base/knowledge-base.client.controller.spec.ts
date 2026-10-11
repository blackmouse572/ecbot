import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { KnowledgeBaseClientController } from '../../../src/modules/knowledge-base/controllers/knowledge-base.client.controller';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

// /client surface: the workspace comes from the client credential, so the
// list must be scoped to it, and the credential's creator must be allowed
// to read knowledge bases.

const mockKnowledgeBaseService = {
    find: jest.fn(),
    getTotal: jest.fn(),
    mapList: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

describe('KnowledgeBaseClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    let controller: KnowledgeBaseClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new KnowledgeBaseClientController(
            mockKnowledgeBaseService as any,
            mockPaginationService as any
        );
    });

    it('is mounted at /knowledge-bases', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, KnowledgeBaseClientController)
        ).toBe('/knowledge-bases');
    });

    it('is guarded by the client credential and the creator policy', () => {
        expect(
            Reflect.getMetadata(
                GUARDS_METADATA,
                KnowledgeBaseClientController.prototype.list
            )
        ).toEqual([ClientCredentialGuard, ClientCredentialPolicyGuard]);
    });

    // Same ability as the matching workspace route: the key can do no more
    // than its creator.
    it.each(['list'] as const)('%s requires KNOWLEDGE_BASE read', handler => {
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                KnowledgeBaseClientController.prototype[handler]
            )
        ).toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ]);
    });

    it('lists the credential workspace knowledge bases, without deleted ones', async () => {
        const mapped = [{ id: 'kb-1', name: 'Shop FAQ' }];
        mockKnowledgeBaseService.find.mockResolvedValue([{ id: 'kb-1' }]);
        mockKnowledgeBaseService.getTotal.mockResolvedValue(1);
        mockKnowledgeBaseService.mapList.mockReturnValue(mapped);

        const result = await controller.list(workspace, {
            _limit: 20,
            _offset: 0,
            _order: { createdAt: 'desc' },
            _search: { name: { $ilike: '%faq%' } },
        } as any);

        const find = {
            name: { $ilike: '%faq%' },
            workspace: 'workspace-1',
            deletedAt: null,
        };
        expect(mockKnowledgeBaseService.find).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 0,
            order: { createdAt: 'desc' },
        });
        expect(mockKnowledgeBaseService.getTotal).toHaveBeenCalledWith(find);
        expect(result).toEqual({
            _pagination: { total: 1, totalPage: 1 },
            data: mapped,
        });
    });
});
