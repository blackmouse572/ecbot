import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export class ChatbotClientPreviewRequestDto {
    @ApiProperty({
        description: 'What the test customer says to the chatbot',
        example: 'Shop có ship COD không?',
    })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    // Same bound as the app's preview chat.
    @MaxLength(2000)
    message: string;

    @ApiPropertyOptional({
        description:
            'The sessionId a previous preview call returned, to continue that chat. Leave it out to start a new one.',
        example: 'q1Xw7mZ0aB3cD4eF',
    })
    @IsOptional()
    // Hashed before it becomes a Redis key, so this bounds the input rather
    // than protecting the key space.
    @Matches(/^[A-Za-z0-9_-]{1,64}$/)
    sessionId?: string;
}
