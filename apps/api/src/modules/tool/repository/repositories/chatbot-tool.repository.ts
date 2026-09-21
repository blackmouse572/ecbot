import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { ChatbotToolEntity } from 'src/modules/tool/repository/entities/chatbot-tool.entity';

@Injectable()
export class ChatbotToolRepository extends EntityRepository<ChatbotToolEntity> {
    constructor(em: EntityManager) {
        super(em, ChatbotToolEntity);
    }

    async findEnabledByChatbotId(
        chatbotId: string,
        workspaceId: string
    ): Promise<ChatbotToolEntity[]> {
        return this.find(
            {
                chatbot: { id: chatbotId, workspace: { id: workspaceId } },
                enabled: true,
                deleted: false,
                tool: { deleted: false },
            },
            { populate: ['tool'] }
        );
    }

    async findOneByChatbotAndTool(
        chatbotId: string,
        toolId: string
    ): Promise<ChatbotToolEntity | null> {
        return this.findOne({
            chatbot: { id: chatbotId },
            tool: { id: toolId },
            deleted: false,
        });
    }
}
