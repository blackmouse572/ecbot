import { ApiProperty } from '@nestjs/swagger';

export class ChatbotModelResponseDto {
    @ApiProperty({ example: 'anthropic/claude-sonnet-4.5' })
    id: string;

    @ApiProperty({ example: 'Claude Sonnet 4.5' })
    name: string;

    @ApiProperty({ example: 'anthropic' })
    provider: string;

    @ApiProperty({ example: 200000, nullable: true })
    contextLength: number | null;

    @ApiProperty({ required: false })
    description?: string;
}
