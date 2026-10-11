import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ChatbotClientController } from '../../../../src/modules/chatbot/controllers/chatbot.client.controller';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';

// The /client surface is called by a third party (e.g. the Ecbot MCP Server)
// holding a ClientCredential. The guard resolves the workspace from the
// credential, so these specs pin the two things that keep a key inside its
// own workspace and its creator's permissions: every handler is guarded by
// ClientCredentialGuard then ClientCredentialPolicyGuard, and
// every query is scoped to the credential's workspace.

const mockChatbotService = {
    findAll: jest.fn(),
    getTotal: jest.fn(),
    findOne: jest.fn(),
    mapList: jest.fn(),
    mapDetails: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

describe('ChatbotClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    let controller: ChatbotClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ChatbotClientController(
            mockChatbotService as any,
            mockPaginationService as any
        );
    });

    // RoutesClientModule mounts it under /client. Registration itself is
    // checked by booting the API: loading the routes module in Jest trips a
    // pre-existing import cycle in the workspace module.
    it('is mounted at /chatbots', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, ChatbotClientController)
        ).toBe('/chatbots');
    });

    it.each(['findAll', 'findOne'] as const)(
        '%s is guarded by the client credential and the creator policy',
        handler => {
            expect(
                Reflect.getMetadata(
                    GUARDS_METADATA,
                    ChatbotClientController.prototype[handler]
                )
            ).toEqual([ClientCredentialGuard, ClientCredentialPolicyGuard]);
        }
    );

    // Same ability as the matching workspace route: the key can do no more
    // than its creator.
    it.each(['findAll', 'findOne'] as const)(
        '%s requires CHATBOT read',
        handler => {
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    ChatbotClientController.prototype[handler]
                )
            ).toEqual([
                {
                    subject: ENUM_POLICY_SUBJECT.CHATBOT,
                    action: [ENUM_POLICY_ACTION.READ],
                },
            ]);
        }
    );

    describe('findAll', () => {
        // @repo/client is generated from these docs, so an undocumented
        // filter is one the MCP server can't send.
        it('documents every filter it accepts', () => {
            const documented = Reflect.getMetadata(
                'swagger/apiParameters', // @nestjs/swagger DECORATORS.API_PARAMETERS
                ChatbotClientController.prototype.findAll
            ).map((param: { name: string }) => param.name);

            expect(documented).toEqual(
                expect.arrayContaining(['status', 'type', 'account'])
            );
        });

        it('lists the credential workspace chatbots with paging, search and filters', async () => {
            const chatbots = [{ id: 'chatbot-1' }];
            const mapped = [{ id: 'chatbot-1', name: 'Shop bot' }];
            mockChatbotService.findAll.mockResolvedValue(chatbots);
            mockChatbotService.getTotal.mockResolvedValue(45);
            mockChatbotService.mapList.mockReturnValue(mapped);

            const result = await controller.findAll(
                workspace,
                {
                    _limit: 20,
                    _offset: 20,
                    _order: { name: 'asc' },
                    _search: { name: { $ilike: '%shop%' } },
                } as any,
                { status: { $in: ['active'] } }
            );

            const find = {
                name: { $ilike: '%shop%' },
                status: { $in: ['active'] },
                workspace: 'workspace-1',
                deletedAt: null,
            };
            expect(mockChatbotService.findAll).toHaveBeenCalledWith(find, {
                paging: { limit: 20, offset: 20 },
                order: { name: 'asc' },
                populate: ['createdBy', 'accounts'],
                select: ['accounts.id'],
            });
            expect(mockChatbotService.getTotal).toHaveBeenCalledWith(find);
            expect(result).toEqual({
                _pagination: { total: 45, totalPage: 3 },
                data: mapped,
            });
        });

        it('keeps the credential workspace even if a filter names another one', async () => {
            mockChatbotService.findAll.mockResolvedValue([]);
            mockChatbotService.getTotal.mockResolvedValue(0);
            mockChatbotService.mapList.mockReturnValue([]);

            await controller.findAll(
                workspace,
                { _limit: 20, _offset: 0, _order: {}, _search: {} } as any,
                { workspace: 'workspace-2' }
            );

            expect(mockChatbotService.findAll.mock.calls[0][0].workspace).toBe(
                'workspace-1'
            );
        });
    });

    describe('findOne', () => {
        it('returns the chatbot when it belongs to the credential workspace', async () => {
            const chatbot = { id: 'chatbot-1' };
            const mapped = { id: 'chatbot-1', name: 'Shop bot' };
            mockChatbotService.findOne.mockResolvedValue(chatbot);
            mockChatbotService.mapDetails.mockReturnValue(mapped);

            const result = await controller.findOne(workspace, 'chatbot-1');

            expect(mockChatbotService.findOne).toHaveBeenCalledWith(
                { id: 'chatbot-1', workspace: 'workspace-1', deletedAt: null },
                {
                    populate: [
                        'accounts',
                        'createdBy',
                        'updatedBy',
                        'workspace',
                    ],
                }
            );
            expect(result).toEqual({ data: mapped });
        });

        it('returns 404 for a chatbot that is missing or in another workspace', async () => {
            mockChatbotService.findOne.mockResolvedValue(null);

            await expect(
                controller.findOne(workspace, 'chatbot-elsewhere')
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockChatbotService.mapDetails).not.toHaveBeenCalled();
        });
    });
});
