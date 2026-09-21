import { ApiProperty } from '@nestjs/swagger';
import { ENUM_SKILL_STATUS } from 'src/modules/skill/enums/skill-status.enum';

export class ChatbotSkillListResponseDto {
    @ApiProperty({ description: 'Skill id' })
    id: string;

    @ApiProperty({ example: 'Refund policy' })
    name: string;

    @ApiProperty({ example: 'refund-policy' })
    slug: string;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty({ enum: ENUM_SKILL_STATUS })
    status: ENUM_SKILL_STATUS;

    @ApiProperty({ description: 'Whether the skill is enabled on the chatbot' })
    enabled: boolean;
}
