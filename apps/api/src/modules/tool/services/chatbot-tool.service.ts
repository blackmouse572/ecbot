import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ChatbotToolEntity } from 'src/modules/tool/repository/entities/chatbot-tool.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { EnableOnChatbotRequestDto } from 'src/modules/tool/dtos/request/enable-on-chatbot.request.dto';
import { UpdateEnabledActionsRequestDto } from 'src/modules/tool/dtos/request/update-enabled-actions.request.dto';
import { ChatbotToolListResponseDto } from 'src/modules/tool/dtos/response/chatbot-tool-list.response.dto';
import { ChatbotCacheService } from 'src/modules/ai-cache/services/chatbot-cache.service';

@Injectable()
export class ChatbotToolService {
    constructor(
        private readonly chatbotToolRepo: ChatbotToolRepository,
        private readonly toolRepo: ToolRepository,
        private readonly chatbotCacheService: ChatbotCacheService
    ) {}

    async enable(
        workspaceId: string,
        chatbotId: string,
        toolId: string,
        dto: EnableOnChatbotRequestDto
    ): Promise<ChatbotToolEntity> {
        const tool = await this.toolRepo.findOneInWorkspace(
            toolId,
            workspaceId
        );
        if (!tool) throw new NotFoundException('tool.get.error.notFound');
        if (tool.status !== ENUM_TOOL_STATUS.ACTIVE) {
            throw new BadRequestException('tool.enable.error.notActive');
        }

        const existing = await this.chatbotToolRepo.findOneByChatbotAndTool(
            chatbotId,
            toolId
        );
        if (existing) {
            existing.enabled = true;
            if (dto.enabledActions !== undefined) {
                existing.enabledActions = dto.enabledActions;
            }
            await this.chatbotToolRepo.getEntityManager().flush();
            await this.chatbotCacheService.invalidate(chatbotId);
            return existing;
        }
        const em = this.chatbotToolRepo.getEntityManager();
        const row = this.chatbotToolRepo.create({
            chatbot: em.getReference(ChatbotEntity, chatbotId),
            tool: em.getReference(ToolEntity, toolId),
            enabled: true,
            enabledActions: dto.enabledActions,
        });
        await em.persistAndFlush(row);
        await this.chatbotCacheService.invalidate(chatbotId);
        return row;
    }

    async disable(
        workspaceId: string,
        chatbotId: string,
        toolId: string
    ): Promise<void> {
        const tool = await this.toolRepo.findOneInWorkspace(
            toolId,
            workspaceId
        );
        if (!tool) throw new NotFoundException('tool.get.error.notFound');

        const row = await this.chatbotToolRepo.findOneByChatbotAndTool(
            chatbotId,
            toolId
        );
        if (!row) throw new NotFoundException('tool.get.error.notFound');
        const em = this.chatbotToolRepo.getEntityManager();
        await em.removeAndFlush(row);
        await this.chatbotCacheService.invalidate(chatbotId);
    }

    async listByChatbot(
        workspaceId: string,
        chatbotId: string
    ): Promise<ChatbotToolListResponseDto[]> {
        const rows = await this.chatbotToolRepo.findEnabledByChatbotId(
            chatbotId,
            workspaceId
        );
        return rows.map(row => {
            const dto = new ChatbotToolListResponseDto();
            dto.id = row.tool.id;
            dto.kind = row.tool.kind;
            dto.name = row.tool.displayName ?? '';
            dto.description = row.tool.description;
            dto.status = row.tool.status;
            dto.enabledActions = row.enabledActions ?? null;
            return dto;
        });
    }

    async updateActions(
        workspaceId: string,
        chatbotId: string,
        toolId: string,
        dto: UpdateEnabledActionsRequestDto
    ): Promise<ChatbotToolEntity> {
        const tool = await this.toolRepo.findOneInWorkspace(
            toolId,
            workspaceId
        );
        if (!tool) throw new NotFoundException('tool.get.error.notFound');

        const row = await this.chatbotToolRepo.findOneByChatbotAndTool(
            chatbotId,
            toolId
        );
        if (!row) throw new NotFoundException('tool.get.error.notFound');
        row.enabledActions = dto.enabledActions;
        await this.chatbotToolRepo.getEntityManager().flush();
        await this.chatbotCacheService.invalidate(chatbotId);
        return row;
    }
}
