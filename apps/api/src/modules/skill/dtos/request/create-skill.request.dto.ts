import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
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
        description: 'Full skill instructions (markdown). Stored on S3.',
        example:
            'Tabgo coadunatio subiungo asporto vacuus sufficio vester sodalitas uberrime victoria. Vulnero amplitudo tempora solio argentum debeo crur. Auxilium defetiscor strues crepusculum comedo campana cras testimonium.\nUsque una velit bellum turba turpis amplus vigor corrumpo. Vehemens canis amet bene. Dapifer thesaurus caveo bos solutio.',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(SKILL_INSTRUCTIONS_MAX_LENGTH)
    instructions: string;

    @ApiPropertyOptional({
        description: 'Skill status',
        enum: ENUM_SKILL_STATUS,
        example: ENUM_SKILL_STATUS.ACTIVE,
    })
    @IsOptional()
    @IsEnum(ENUM_SKILL_STATUS)
    status?: ENUM_SKILL_STATUS;
}
