import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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

    @ApiPropertyOptional({ enum: ENUM_SKILL_STATUS })
    @IsOptional()
    @IsEnum(ENUM_SKILL_STATUS)
    status?: ENUM_SKILL_STATUS;
}
