import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ActivityAdminWorkspaceResponseDto } from 'src/modules/activity/dtos/response/activity.admin-workspace.response.dto';
import { ENUM_SKILL_STATUS } from '../../enums/skill-status.enum';

export class ChatbotSkillAdminChatbotResponseDto {
    @ApiProperty({ example: '7c1f2a3e-5b9d-4e8f-a1c2-3d4e5f6a7b8c' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Lotus Spa Receptionist' })
    @Expose()
    name: string;

    @ApiProperty({ nullable: true, type: String })
    @Expose()
    avatar: string | null;
}

export class ChatbotSkillAdminSkillResponseDto {
    @ApiProperty({ example: 'bab80caa-50d0-496a-9d19-c8a3c3c93520' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Refund policy' })
    @Expose()
    name: string;

    @ApiProperty({ example: 'refund-policy' })
    @Expose()
    slug: string;

    @ApiProperty({ enum: ENUM_SKILL_STATUS })
    @Expose()
    status: ENUM_SKILL_STATUS;

    @ApiProperty({ description: 'True for Ecbot builtin skills' })
    @Expose()
    isBuiltin: boolean;
}

// One agent-skill link. An allowlist: the chatbot carries its prompt and the
// workspace its invitation code, neither of which leaves the service.
export class ChatbotSkillAdminListResponseDto {
    @ApiProperty({ description: 'Link id' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'Whether the agent uses the skill now' })
    @Expose()
    enabled: boolean;

    @ApiProperty({ type: ChatbotSkillAdminChatbotResponseDto })
    @Expose()
    @Type(() => ChatbotSkillAdminChatbotResponseDto)
    chatbot: ChatbotSkillAdminChatbotResponseDto;

    @ApiProperty({ type: ChatbotSkillAdminSkillResponseDto })
    @Expose()
    @Type(() => ChatbotSkillAdminSkillResponseDto)
    skill: ChatbotSkillAdminSkillResponseDto;

    @ApiProperty({ type: ActivityAdminWorkspaceResponseDto })
    @Expose()
    @Type(() => ActivityAdminWorkspaceResponseDto)
    workspace: ActivityAdminWorkspaceResponseDto;

    @ApiProperty({ description: 'When the skill was attached' })
    @Expose()
    createdAt: Date;
}
