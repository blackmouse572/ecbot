import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';
import { ChatbotSkillClientController } from '../../../../src/modules/skill/controllers/chatbot-skill.client.controller';

// /client surface: which skills a chatbot loads. The service checks the
// chatbot and the skill are in the credential's workspace, and only a
// workspace-owned skill attaches (clone a template first).

const mockChatbotSkillService = {
    listByChatbot: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

describe('ChatbotSkillClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: ChatbotSkillClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ChatbotSkillClientController(
            mockChatbotSkillService as any,
            mockActivityService as any
        );
    });

    it('is mounted under its chatbot', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, ChatbotSkillClientController)
        ).toBe('/chatbots/:chatbotId/skills');
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['attach', ENUM_POLICY_ACTION.UPDATE],
        ['detach', ENUM_POLICY_ACTION.UPDATE],
    ] as const)('%s is guarded and needs SKILL %s', (handler, action) => {
        const method = ChatbotSkillClientController.prototype[handler];
        expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
            ClientCredentialGuard,
            ClientCredentialPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                method
            )
        ).toEqual([{ subject: ENUM_POLICY_SUBJECT.SKILL, action: [action] }]);
    });

    it("lists a chatbot's skills in the credential workspace", async () => {
        mockChatbotSkillService.listByChatbot.mockResolvedValue([
            { id: 'cs-1' },
        ]);

        await expect(controller.list(workspace, 'bot-1')).resolves.toEqual({
            data: [{ id: 'cs-1' }],
        });
        expect(mockChatbotSkillService.listByChatbot).toHaveBeenCalledWith(
            'workspace-1',
            'bot-1'
        );
    });

    it('attaches a skill to a chatbot and logs it as the creator', async () => {
        mockChatbotSkillService.attach.mockResolvedValue({ id: 'cs-1' });

        const result = await controller.attach(
            workspace,
            credential,
            'bot-1',
            's-1',
            {}
        );

        expect(mockChatbotSkillService.attach).toHaveBeenCalledWith(
            'workspace-1',
            'bot-1',
            's-1',
            {}
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'chatbot_skill_enable',
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { chatbotId: 'bot-1', skillId: 's-1' },
        });
        expect(result).toEqual({ data: { id: 'cs-1' } });
    });

    it('detaches a skill from a chatbot and logs it as the creator', async () => {
        const result = await controller.detach(
            workspace,
            credential,
            'bot-1',
            's-1'
        );

        expect(mockChatbotSkillService.detach).toHaveBeenCalledWith(
            'workspace-1',
            'bot-1',
            's-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'chatbot_skill_disable',
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { chatbotId: 'bot-1', skillId: 's-1' },
        });
        expect(result).toEqual({ data: { id: 's-1' } });
    });
});
