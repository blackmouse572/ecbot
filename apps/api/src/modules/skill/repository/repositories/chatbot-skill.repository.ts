import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ChatbotSkillEntity } from 'src/modules/skill/repository/entities/chatbot-skill.entity';

@Injectable()
export class ChatbotSkillRepository extends EntityRepository<ChatbotSkillEntity> {
    constructor(em: EntityManager) {
        super(em, ChatbotSkillEntity);
    }

    async findEnabledByChatbotId(
        chatbotId: string,
        workspaceId: string
    ): Promise<ChatbotSkillEntity[]> {
        return this.find(
            {
                chatbot: { id: chatbotId, workspace: { id: workspaceId } },
                enabled: true,
                deleted: false,
                skill: { deleted: false },
            },
            { populate: ['skill'] }
        );
    }

    async findByChatbotId(
        chatbotId: string,
        workspaceId: string
    ): Promise<ChatbotSkillEntity[]> {
        return this.find(
            {
                chatbot: { id: chatbotId, workspace: { id: workspaceId } },
                deleted: false,
                skill: { deleted: false },
            },
            { populate: ['skill'] }
        );
    }

    async findOneByChatbotAndSkill(
        chatbotId: string,
        skillId: string,
        workspaceId: string
    ): Promise<ChatbotSkillEntity | null> {
        return this.findOne({
            chatbot: { id: chatbotId, workspace: { id: workspaceId } },
            skill: { id: skillId },
            deleted: false,
        });
    }
}
