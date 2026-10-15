import { ApiProperty } from '@nestjs/swagger';
import type { SkillStep } from '@repo/agent-blueprint';
import { Expose } from 'class-transformer';
import { ENUM_SKILL_FORMAT } from 'src/modules/skill/enums/skill-format.enum';
import { SkillListResponseDto } from 'src/modules/skill/dtos/response/skill.list.response.dto';

export class SkillGetResponseDto extends SkillListResponseDto {
    @ApiProperty({
        description:
            'CONTENT: the markdown the owner wrote. STEPS: the compiled body the agent loads.',
        example: '# Refund policy\n\nWhen the customer asks for a refund...',
    })
    @Expose()
    instructions: string;

    @ApiProperty({
        enum: ENUM_SKILL_FORMAT,
        example: ENUM_SKILL_FORMAT.CONTENT,
    })
    @Expose()
    format: ENUM_SKILL_FORMAT;

    @ApiProperty({
        required: false,
        description: 'Step tree of a STEPS skill',
        type: 'array',
        items: { type: 'object' },
    })
    @Expose()
    steps?: SkillStep[];

    @ApiProperty({ type: [String], example: [] })
    @Expose()
    guardrails: string[];
}
