import {
    EntityManager,
    EntityRepository,
    FilterQuery,
} from '@mikro-orm/postgresql';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
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

    /** The workspace's chatbots the skill is attached to, enabled or not. */
    async findBySkillId(
        skillId: string,
        workspaceId: string
    ): Promise<ChatbotSkillEntity[]> {
        return this.find(
            {
                skill: { id: skillId },
                chatbot: { workspace: { id: workspaceId }, deleted: false },
                deleted: false,
            },
            { populate: ['chatbot'], orderBy: { chatbot: { name: 'ASC' } } }
        );
    }

    /** Admin: links in every workspace, with agent, workspace and skill. */
    async findAllForAdmin(
        where: FilterQuery<ChatbotSkillEntity>,
        options: { limit?: number; offset?: number; order?: IPaginationOrder }
    ): Promise<ChatbotSkillEntity[]> {
        return this.find(where, {
            limit: options.limit,
            offset: options.offset,
            orderBy: options.order,
            populate: ['chatbot.workspace', 'skill'],
        });
    }

    async countForAdmin(
        where: FilterQuery<ChatbotSkillEntity>
    ): Promise<number> {
        return this.count(where);
    }
}
