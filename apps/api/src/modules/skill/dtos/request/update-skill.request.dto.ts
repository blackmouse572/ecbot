import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import {
    SKILL_GUARDRAILS_MAX,
    SKILL_GUARDRAIL_MAX,
    type SkillStep,
} from '@repo/agent-blueprint';
import { ENUM_SKILL_FORMAT } from 'src/modules/skill/enums/skill-format.enum';

import { SKILL_INSTRUCTIONS_MAX_LENGTH } from 'src/modules/skill/constants/skill.constant';
import { ENUM_SKILL_STATUS } from 'src/modules/skill/enums/skill-status.enum';

export class UpdateSkillRequestDto {
    @ApiPropertyOptional({ description: 'Human-friendly skill name' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ description: 'Discovery description' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({
        description:
            'Full skill instructions (markdown). Overwrites the S3 object.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(SKILL_INSTRUCTIONS_MAX_LENGTH)
    instructions?: string;

    @ApiPropertyOptional({
        description:
            'CONTENT: free markdown in `instructions`. STEPS: structured `steps`. Defaults to CONTENT.',
        enum: ENUM_SKILL_FORMAT,
    })
    @IsOptional()
    @IsEnum(ENUM_SKILL_FORMAT)
    format?: ENUM_SKILL_FORMAT;

    @ApiPropertyOptional({
        description:
            'Step tree for a STEPS skill: ask, say, tell, tool ({ toolId, action? }) and if ({ branches: [{ condition, steps }], otherwise }). Each step and branch needs a unique `id`.',
        type: 'array',
        items: { type: 'object' },
        example: [
            { id: 's1', type: 'ask', text: 'The order code' },
            { id: 's2', type: 'say', text: 'Thanks, one moment.' },
        ],
    })
    @IsOptional()
    @IsArray()
    steps?: SkillStep[];

    @ApiPropertyOptional({
        description: 'Rules the agent always follows while using this skill',
        type: [String],
        example: ['Never share details of another customer order.'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(SKILL_GUARDRAILS_MAX)
    @IsString({ each: true })
    @MaxLength(SKILL_GUARDRAIL_MAX, { each: true })
    guardrails?: string[];

    @ApiPropertyOptional({ enum: ENUM_SKILL_STATUS })
    @IsOptional()
    @IsEnum(ENUM_SKILL_STATUS)
    status?: ENUM_SKILL_STATUS;
}
