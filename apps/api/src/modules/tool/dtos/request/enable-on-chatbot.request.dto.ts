import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

export class EnableOnChatbotRequestDto {
    @ApiPropertyOptional({
        type: [String],
        description:
            'When omitted = enable all discovered actions (for MCP). Ignored for HTTP kind.',
    })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    enabledActions?: string[];
}
