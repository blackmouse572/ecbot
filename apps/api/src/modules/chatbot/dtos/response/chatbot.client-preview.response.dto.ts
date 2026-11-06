import { ApiProperty } from '@nestjs/swagger';

class ChatbotPreviewMediaResponseDto {
    @ApiProperty()
    url: string;

    @ApiProperty({ enum: ['image', 'file'] })
    kind: 'image' | 'file';

    @ApiProperty({ required: false })
    name?: string;

    @ApiProperty({ required: false })
    size?: number;

    @ApiProperty({ required: false })
    mimeType?: string;
}

class ChatbotPreviewToolCallResponseDto {
    @ApiProperty({ example: 'search_knowledge' })
    name: string;

    @ApiProperty({
        description: 'The arguments the chatbot passed to the tool',
        type: 'object',
        additionalProperties: true,
    })
    input: unknown;
}

export class ChatbotClientPreviewResponseDto {
    @ApiProperty({
        description: 'Send it back with the next message to continue this chat',
    })
    sessionId: string;

    @ApiProperty({ description: "The chatbot's reply text" })
    reply: string;

    @ApiProperty({
        type: ChatbotPreviewMediaResponseDto,
        isArray: true,
        description: 'Images and files the reply sent',
    })
    media: ChatbotPreviewMediaResponseDto[];

    @ApiProperty({
        type: ChatbotPreviewToolCallResponseDto,
        isArray: true,
        description: 'Tools the chatbot called for this reply, in order',
    })
    toolCalls: ChatbotPreviewToolCallResponseDto[];

    @ApiProperty({
        description:
            'A guardrail stopped the reply; reply is then empty and the turn is not kept',
    })
    blocked: boolean;
}
