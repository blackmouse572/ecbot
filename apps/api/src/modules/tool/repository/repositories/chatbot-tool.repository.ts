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

    /** Live agents with the tool turned on, keyed by tool id. */
    async countChatbotsByTools(
        toolIds: string[]
    ): Promise<Map<string, number>> {
        if (toolIds.length === 0) return new Map();

        const rows: { id: string; chatbot_count: string }[] = await this.em
            .getConnection()
            .execute(
                `
                SELECT link.tool_id AS id,
                       COUNT(DISTINCT link.chatbot_id) AS chatbot_count
                FROM chatbot_tools link
                JOIN chatbots ON chatbots.id = link.chatbot_id
                WHERE link.tool_id IN (?)
                  AND link.enabled
                  AND NOT link.deleted
                  AND chatbots.deleted_at IS NULL
                GROUP BY link.tool_id
                `,
                [toolIds]
            );

        return new Map(rows.map(row => [row.id, Number(row.chatbot_count)]));
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
