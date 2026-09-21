import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AttachSkillRequestDto {
    @ApiPropertyOptional({
        description: 'Whether the skill is enabled on the chatbot',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
