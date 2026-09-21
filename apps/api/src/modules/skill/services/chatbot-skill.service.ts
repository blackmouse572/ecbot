import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { AttachSkillRequestDto } from 'src/modules/skill/dtos/request/attach-skill.request.dto';
import { ChatbotSkillListResponseDto } from 'src/modules/skill/dtos/response/chatbot-skill.list.response.dto';
import { ChatbotSkillEntity } from 'src/modules/skill/repository/entities/chatbot-skill.entity';
import { SkillEntity } from 'src/modules/skill/repository/entities/skill.entity';
import { ChatbotSkillRepository } from 'src/modules/skill/repository/repositories/chatbot-skill.repository';
import { SkillRepository } from 'src/modules/skill/repository/repositories/skill.repository';
import { ChatbotCacheService } from 'src/modules/ai-cache/services/chatbot-cache.service';

@Injectable()
export class ChatbotSkillService {
    constructor(
        private readonly chatbotSkillRepo: ChatbotSkillRepository,
        private readonly skillRepo: SkillRepository,
        private readonly em: EntityManager,
        private readonly chatbotCacheService: ChatbotCacheService
    ) {}

    async attach(
        workspaceId: string,
        chatbotId: string,
        skillId: string,
        dto: AttachSkillRequestDto
    ): Promise<ChatbotSkillEntity> {
        // Only workspace-owned skills are attachable — builtin templates must be
        // cloned into the workspace first (copy-on-add model).
        const skill = await this.skillRepo.findOneOwned(skillId, workspaceId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');

        const existing = await this.chatbotSkillRepo.findOneByChatbotAndSkill(
            chatbotId,
            skillId,
            workspaceId
        );
        if (existing) {
            existing.enabled = dto.enabled ?? true;
            await this.em.flush();
            await this.chatbotCacheService.invalidate(chatbotId);
            return existing;
        }
        const row = this.chatbotSkillRepo.create({
            chatbot: this.em.getReference(ChatbotEntity, chatbotId),
            skill: this.em.getReference(SkillEntity, skillId),
            enabled: dto.enabled ?? true,
        });
        await this.em.persistAndFlush(row);
        await this.chatbotCacheService.invalidate(chatbotId);
        return row;
    }

    async setEnabled(
        workspaceId: string,
        chatbotId: string,
        skillId: string,
        enabled: boolean
    ): Promise<ChatbotSkillEntity> {
        const skill = await this.skillRepo.findOneOwned(skillId, workspaceId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');

        const row = await this.chatbotSkillRepo.findOneByChatbotAndSkill(
            chatbotId,
            skillId,
            workspaceId
        );
        if (!row) throw new NotFoundException('skill.attach.error.notAttached');
        row.enabled = enabled;
        await this.em.flush();
        await this.chatbotCacheService.invalidate(chatbotId);
        return row;
    }

    async detach(
        workspaceId: string,
        chatbotId: string,
        skillId: string
    ): Promise<void> {
        const row = await this.chatbotSkillRepo.findOneByChatbotAndSkill(
            chatbotId,
            skillId,
            workspaceId
        );
        if (!row) throw new NotFoundException('skill.attach.error.notAttached');
        await this.em.removeAndFlush(row);
        await this.chatbotCacheService.invalidate(chatbotId);
    }

    async listByChatbot(
        workspaceId: string,
        chatbotId: string
    ): Promise<ChatbotSkillListResponseDto[]> {
        const rows = await this.chatbotSkillRepo.findByChatbotId(
            chatbotId,
            workspaceId
        );
        return rows.map(row => {
            const dto = new ChatbotSkillListResponseDto();
            dto.id = row.skill.id;
            dto.name = row.skill.name;
            dto.slug = row.skill.slug;
            dto.description = row.skill.description;
            dto.status = row.skill.status;
            dto.enabled = row.enabled;
            return dto;
        });
    }
}
