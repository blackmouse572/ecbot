import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { ConversationEntity } from '../repository/entities/conversation.entity';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';

export interface IConversationFindOrCreate {
    chatbotId: string;
    accountId: string;
    senderId: string;
    contactPointId?: string;
}

export interface IConversationService {
    findOrCreate(
        params: IConversationFindOrCreate
    ): Promise<ConversationEntity>;
    findOneById(id: string): Promise<ConversationEntity | null>;
    findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ConversationEntity[]>;
    countByWorkspace(
        workspaceId: string,
        find?: Record<string, any>
    ): Promise<number>;
    updateStatus(
        conversationId: string,
        status: ENUM_CONVERSATION_STATUS,
        reason?: string
    ): Promise<ConversationEntity>;
    setBotEnabled(
        conversationId: string,
        botEnabled: boolean,
        reason?: string
    ): Promise<ConversationEntity>;
    recordFallback(
        chatbotId: string,
        accountId: string,
        senderId: string,
        fallbackThreshold: number
    ): Promise<{ triggered: boolean; conversation: ConversationEntity }>;
    detectHandoffKeywords(message: string, keywords: string[]): boolean;
    touchLastMessage(
        chatbotId: string,
        accountId: string,
        senderId: string
    ): Promise<void>;
    resetFallbackCount(conversationId: string): Promise<void>;
    mapGet(conversation: ConversationEntity): ConversationGetResponseDto;
    mapList(
        conversations: ConversationEntity[],
        unreadCounts?: Map<string, number>
    ): ConversationGetResponseDto[];
    findOneByIdInWorkspace(
        id: string,
        workspaceId: string
    ): Promise<ConversationEntity | null>;
    markConversationRead(
        operatorId: string,
        conversationId: string
    ): Promise<void>;
    getUnreadCounts(
        operatorId: string,
        conversationIds: string[],
        workspaceId: string
    ): Promise<Map<string, number>>;
}
