import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';
import { ChatbotToolClientController } from '../../../../src/modules/tool/controllers/chatbot-tool.client.controller';

// /client surface: which tools a chatbot may call. The service checks the
// chatbot and the tool are in the credential's workspace.

const mockChatbotToolService = {
    listByChatbot: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

describe('ChatbotToolClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: ChatbotToolClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ChatbotToolClientController(
            mockChatbotToolService as any,
            mockActivityService as any
        );
    });

    it('is mounted under its chatbot', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, ChatbotToolClientController)
        ).toBe('/chatbots/:chatbotId/tools');
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['enable', ENUM_POLICY_ACTION.UPDATE],
        ['disable', ENUM_POLICY_ACTION.UPDATE],
    ] as const)('%s is guarded and needs TOOL %s', (handler, action) => {
        const method = ChatbotToolClientController.prototype[handler];
        expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
            ClientCredentialGuard,
            ClientCredentialPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                method
            )
        ).toEqual([{ subject: ENUM_POLICY_SUBJECT.TOOL, action: [action] }]);
    });

    it("lists a chatbot's tools in the credential workspace", async () => {
        mockChatbotToolService.listByChatbot.mockResolvedValue([
            { id: 'ct-1' },
        ]);

        await expect(controller.list(workspace, 'bot-1')).resolves.toEqual({
            data: [{ id: 'ct-1' }],
        });
        expect(mockChatbotToolService.listByChatbot).toHaveBeenCalledWith(
            'workspace-1',
            'bot-1'
        );
    });

    it('enables a tool on a chatbot and logs it as the creator', async () => {
        mockChatbotToolService.enable.mockResolvedValue({ id: 'ct-1' });

        const result = await controller.enable(
            workspace,
            credential,
            'bot-1',
            't-1',
            { enabledActions: ['create_order'] }
        );

        expect(mockChatbotToolService.enable).toHaveBeenCalledWith(
            'workspace-1',
            'bot-1',
            't-1',
            { enabledActions: ['create_order'] }
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'chatbot_tool_enable',
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: 'ct-1', name: 't-1' },
        });
        expect(result).toEqual({ data: { id: 'ct-1' } });
    });

    it('disables a tool on a chatbot and logs it as the creator', async () => {
        await controller.disable(workspace, credential, 'bot-1', 't-1');

        expect(mockChatbotToolService.disable).toHaveBeenCalledWith(
            'workspace-1',
            'bot-1',
            't-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'chatbot_tool_disable',
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: 't-1', name: 't-1' },
        });
    });
});
