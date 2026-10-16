import { ConflictException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { ChatbotKnowledgeItemClientController } from '../../../src/modules/knowledge-base/controllers/chatbot-knowledge-item.client.controller';

// /client surface: which knowledge a chatbot answers from. Writes act as the
// credential's creator.

describe('ChatbotKnowledgeItemClientController', () => {
    const workspace = { id: 'workspace-1' } as any;
    const credential = { createdBy: { id: 'creator-1' } } as any;

    let chatbotService: { findOne: jest.Mock };
    let knowledgeItemService: {
        resolveBatchTarget: jest.Mock;
        findOne: jest.Mock;
    };
    let chatbotKnowledgeItemService: {
        findByChatbot: jest.Mock;
        getTotalByChatbot: jest.Mock;
        mapList: jest.Mock;
        linkItem: jest.Mock;
        unlinkItem: jest.Mock;
        syncChatbotLinks: jest.Mock;
    };
    let activityService: { createByUser: jest.Mock };
    let itemRepository: { findOne: jest.Mock };
    let session: {
        begin: jest.Mock;
        commit: jest.Mock;
        rollback: jest.Mock;
        getRepository: jest.Mock;
    };
    let controller: ChatbotKnowledgeItemClientController;

    beforeEach(() => {
        chatbotService = {
            findOne: jest.fn().mockResolvedValue({ id: 'chatbot-1' }),
        };
        knowledgeItemService = {
            resolveBatchTarget: jest.fn(),
            findOne: jest.fn(),
        };
        chatbotKnowledgeItemService = {
            findByChatbot: jest.fn().mockResolvedValue([{ id: 'link-1' }]),
            getTotalByChatbot: jest.fn().mockResolvedValue(1),
            mapList: jest.fn(list => list),
            linkItem: jest.fn(),
            unlinkItem: jest.fn(),
            syncChatbotLinks: jest.fn().mockResolvedValue(undefined),
        };
        activityService = { createByUser: jest.fn() };
        itemRepository = { findOne: jest.fn() };
        session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            getRepository: jest.fn(() => itemRepository),
        };
        controller = new ChatbotKnowledgeItemClientController(
            { fork: jest.fn(() => session) } as any,
            chatbotService as any,
            knowledgeItemService as any,
            chatbotKnowledgeItemService as any,
            { totalPage: jest.fn(() => 1) } as any,
            activityService as any
        );
    });

    it('is mounted under its chatbot', () => {
        expect(
            Reflect.getMetadata(
                PATH_METADATA,
                ChatbotKnowledgeItemClientController
            )
        ).toBe('/chatbots/:chatbotId/knowledge-items');
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['link', ENUM_POLICY_ACTION.CREATE],
        ['unlink', ENUM_POLICY_ACTION.DELETE],
    ] as const)(
        '%s is guarded and needs KNOWLEDGE_BASE %s',
        (handler, action) => {
            const method =
                ChatbotKnowledgeItemClientController.prototype[handler];
            expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
                ClientCredentialGuard,
                ClientCredentialPolicyGuard,
            ]);
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    method
                )
            ).toEqual([
                {
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    action: [action],
                },
            ]);
        }
    );

    it("lists a chatbot's knowledge", async () => {
        const result = await controller.list(workspace, 'chatbot-1', {
            _limit: 20,
            _offset: 0,
            _order: { priority: 'desc' },
        } as any);

        expect(chatbotService.findOne).toHaveBeenCalledWith(
            { id: 'chatbot-1', workspace: 'workspace-1' },
            { populate: [] }
        );
        expect(result).toEqual({
            data: [{ id: 'link-1' }],
            _pagination: { total: 1, totalPage: 1 },
        });
    });

    it('404s a chatbot from another workspace', async () => {
        chatbotService.findOne.mockResolvedValue(null);

        await expect(
            controller.list(workspace, 'chatbot-2', {} as any)
        ).rejects.toThrow(NotFoundException);
        await expect(
            controller.link(workspace, credential, 'chatbot-2', {
                ids: ['item-1'],
            } as any)
        ).rejects.toThrow(NotFoundException);
        expect(knowledgeItemService.resolveBatchTarget).not.toHaveBeenCalled();
    });

    describe('link', () => {
        beforeEach(() => {
            knowledgeItemService.resolveBatchTarget.mockResolvedValue({
                ids: ['item-1', 'item-2', 'item-3'],
                truncated: false,
            });
            itemRepository.findOne.mockImplementation(({ id }) =>
                Promise.resolve({
                    id,
                    knowledgeBase: {
                        workspace: {
                            id: id === 'item-3' ? 'other' : 'workspace-1',
                        },
                    },
                })
            );
            chatbotKnowledgeItemService.linkItem.mockImplementation(
                (_chatbotId, id) =>
                    id === 'item-2'
                        ? Promise.reject(new ConflictException())
                        : Promise.resolve({ id: 'link' })
            );
        });

        it('links each item as the creator, counting an existing link as linked', async () => {
            const { data } = await controller.link(
                workspace,
                credential,
                'chatbot-1',
                { ids: ['item-1', 'item-2', 'item-3'] } as any
            );

            expect(data.succeeded).toEqual(['item-1', 'item-2']);
            expect(data.failed).toEqual([
                expect.objectContaining({ id: 'item-3' }),
            ]);
            expect(data.truncated).toBe(false);
            expect(chatbotKnowledgeItemService.linkItem).toHaveBeenCalledWith(
                'chatbot-1',
                'item-1',
                expect.objectContaining({ actionBy: 'creator-1' })
            );
            expect(activityService.createByUser).toHaveBeenCalledTimes(1);
            expect(activityService.createByUser).toHaveBeenCalledWith(
                credential.createdBy,
                expect.objectContaining({
                    metadata: {
                        chatbotId: 'chatbot-1',
                        knowledgeItemId: 'item-1',
                    },
                }),
                expect.anything()
            );
            expect(
                chatbotKnowledgeItemService.syncChatbotLinks
            ).toHaveBeenCalledTimes(1);
        });
    });

    it('unlinks an item as the creator and syncs it', async () => {
        knowledgeItemService.findOne.mockResolvedValue({ title: 'Menu' });

        const result = await controller.unlink(
            workspace,
            credential,
            'chatbot-1',
            'item-1'
        );

        expect(chatbotKnowledgeItemService.unlinkItem).toHaveBeenCalledWith(
            'chatbot-1',
            'item-1',
            expect.objectContaining({ actionBy: 'creator-1' })
        );
        expect(session.commit).toHaveBeenCalled();
        expect(
            chatbotKnowledgeItemService.syncChatbotLinks
        ).toHaveBeenCalledWith('item-1');
        expect(result.data).toEqual({ id: 'item-1' });
    });
});
