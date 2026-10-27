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

    /** The admin view of the same list: the chatbot's workspace is not checked. */
    async findEnabledByChatbotIdAnyWorkspace(
        chatbotId: string
    ): Promise<ChatbotToolEntity[]> {
        return this.find(
            {
                chatbot: { id: chatbotId },
                enabled: true,
                deleted: false,
                tool: { deleted: false },
            },
            { populate: ['tool'] }
        );
    }

    /** Every tool link of these chatbots, enabled or not. */
    async findByChatbotIds(chatbotIds: string[]): Promise<ChatbotToolEntity[]> {
        if (!chatbotIds.length) return [];
        return this.find(
            {
                chatbot: { id: { $in: chatbotIds } },
                deleted: false,
                tool: { deleted: false },
            },
            { populate: ['tool'] }
        );
    }

    /** Every chatbot the tool is linked to, enabled or not. */
    async findChatbotIdsByToolId(toolId: string): Promise<string[]> {
        const rows = await this.find({ tool: { id: toolId }, deleted: false });
        return rows.map(row => row.chatbot.id);
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
