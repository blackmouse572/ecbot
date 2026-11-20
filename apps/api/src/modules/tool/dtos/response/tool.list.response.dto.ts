import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ToolResponseDto } from './tool.response.dto';

export class ToolListResponseDto extends OmitType(ToolResponseDto, [
    'httpInputSchema',
    'discoveredActions',
] as const) {
    @ApiPropertyOptional({
        description:
            'How many agents have this tool turned on. Only the workspace list fills it.',
        example: 2,
    })
    @Expose()
    chatbotCount?: number;
}
