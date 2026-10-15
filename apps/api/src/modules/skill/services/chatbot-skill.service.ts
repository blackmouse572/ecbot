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
import { SkillUsageResponseDto } from 'src/modules/skill/dtos/response/skill-usage.response.dto';
import { ENUM_SKILL_FORMAT } from 'src/modules/skill/enums/skill-format.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { skillToolRefs } from '@repo/agent-blueprint';

@Injectable()
export class ChatbotSkillService {
    constructor(
        private readonly chatbotSkillRepo: ChatbotSkillRepository,
        private readonly skillRepo: SkillRepository,
        private readonly em: EntityManager,
        private readonly chatbotCacheService: ChatbotCacheService,
        private readonly chatbotToolRepo: ChatbotToolRepository,
        private readonly toolRepo: ToolRepository
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

    // Which tools a skill's steps call, and which chatbots it is attached to,
    // with the tools each of those chatbots cannot call (not linked, switched
    // off, or an MCP action left out of the link).
    async usage(
        workspaceId: string,
        skillId: string
    ): Promise<SkillUsageResponseDto> {
        const skill = await this.skillRepo.findOneReadable(
            skillId,
            workspaceId
        );
        if (!skill) throw new NotFoundException('skill.get.error.notFound');

        const refs =
            skill.format === ENUM_SKILL_FORMAT.STEPS && skill.steps
                ? skillToolRefs(skill.steps)
                : [];
        const tools = refs.length
            ? await this.toolRepo.findByIdsInWorkspace(
                  [...new Set(refs.map(r => r.toolId))],
                  workspaceId
              )
            : [];
        const toolById = new Map(tools.map(t => [t.id, t]));
        const used = refs.filter(r => toolById.has(r.toolId));

        const rows = await this.chatbotSkillRepo.findBySkillId(
            skillId,
            workspaceId
        );
        const links = used.length
            ? await this.chatbotToolRepo.findByChatbotIds(
                  rows.map(r => r.chatbot.id)
              )
            : [];
        const canCall = (chatbotId: string, toolId: string, action?: string) =>
            links.some(
                l =>
                    l.chatbot.id === chatbotId &&
                    l.tool.id === toolId &&
                    l.enabled &&
                    (l.tool.kind !== ENUM_TOOL_KIND.MCP ||
                        !l.enabledActions ||
                        (!!action && l.enabledActions.includes(action)))
            );

        return {
            tools: used.map(r => {
                const tool = toolById.get(r.toolId)!;
                return {
                    id: tool.id,
                    name: tool.displayName,
                    kind: tool.kind,
                    ...(r.action && { action: r.action }),
                };
            }),
            chatbots: rows.map(row => ({
                id: row.chatbot.id,
                name: row.chatbot.name,
                enabled: row.enabled,
                missingTools: used
                    .filter(r => !canCall(row.chatbot.id, r.toolId, r.action))
                    .map(r => ({
                        id: r.toolId,
                        ...(r.action && { action: r.action }),
                    })),
            })),
        };
    }
}
