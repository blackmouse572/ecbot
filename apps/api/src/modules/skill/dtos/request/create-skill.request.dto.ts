import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
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

export class CreateSkillRequestDto {
    @ApiProperty({
        description: 'Human-friendly skill name',
        example: 'Refund policy',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({
        description:
            'Short description used for discovery — tells the agent when to load this skill',
        example: 'Use when the customer asks about refunds or returns.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        description:
            'Skill instructions (markdown). Required for CONTENT skills, ignored for STEPS.',
        example:
            'Tabgo coadunatio subiungo asporto vacuus sufficio vester sodalitas uberrime victoria. Vulnero amplitudo tempora solio argentum debeo crur. Auxilium defetiscor strues crepusculum comedo campana cras testimonium.\nUsque una velit bellum turba turpis amplus vigor corrumpo. Vehemens canis amet bene. Dapifer thesaurus caveo bos solutio.',
        required: false,
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
            'Step tree for a STEPS skill: ask, say, tell, tool ({ toolId, action? }; toolId can be a built-in action: system:handoff, system:notify_team, system:add_tag, system:remove_tag, system:schedule_followup, system:save_customer_field, with the tag or field name in action) and if ({ branches: [{ condition, steps }], otherwise }). Each step and branch needs a unique `id`.',
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

    @ApiPropertyOptional({
        description: 'Skill status',
        enum: ENUM_SKILL_STATUS,
        example: ENUM_SKILL_STATUS.ACTIVE,
    })
    @IsOptional()
    @IsEnum(ENUM_SKILL_STATUS)
    status?: ENUM_SKILL_STATUS;
}
