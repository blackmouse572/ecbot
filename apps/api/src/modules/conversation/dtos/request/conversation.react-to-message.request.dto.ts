import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ConversationReactToMessageRequestDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: 'Emoji to react with',
        example: '❤️',
    })
    emoji: string;

    @IsIn(['react', 'unreact'])
    @ApiProperty({
        description: 'Whether to add or remove the reaction',
        enum: ['react', 'unreact'],
        example: 'react',
    })
    action: 'react' | 'unreact';
}
