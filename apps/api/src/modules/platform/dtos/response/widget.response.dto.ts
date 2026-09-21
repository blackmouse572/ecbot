import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WidgetMetaResponseDto {
    @ApiProperty({ description: 'Chatbot display name', example: 'Shop Helper' })
    name: string;

    @ApiPropertyOptional({ description: 'Chatbot avatar URL' })
    avatar?: string;

    @ApiPropertyOptional({
        description: 'First message shown before the visitor types',
        example: 'Hi! How can I help?',
    })
    welcomeMessage?: string;

    @ApiPropertyOptional({ description: 'Chatbot primary language' })
    primaryLanguage?: string;

    @ApiPropertyOptional({
        description: 'Launcher and window styling configured by the operator',
    })
    theme?: Record<string, unknown>;

    @ApiProperty({
        description:
            'Origins allowed to embed this widget. The widget refuses to render elsewhere.',
        example: ['https://shop.example.com'],
        isArray: true,
        type: String,
    })
    allowedOrigins: string[];
}

export class WidgetMessageResponseDto {
    @ApiProperty({ description: 'Message id — pass back as the poll cursor' })
    id: string;

    @ApiProperty({
        description: 'Who wrote it',
        enum: ['USER', 'BOT', 'OPERATOR'],
        example: 'OPERATOR',
    })
    authorType: string;

    @ApiPropertyOptional({ description: 'Message text' })
    text?: string;

    @ApiProperty({ description: 'When it was sent' })
    dateSent: Date;
}
