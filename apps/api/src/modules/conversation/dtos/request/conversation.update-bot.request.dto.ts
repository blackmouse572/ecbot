import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ConversationUpdateBotRequestDto {
    @IsBoolean()
    @IsNotEmpty()
    @ApiProperty({
        description:
            'Whether the bot replies automatically in this conversation',
        example: false,
    })
    botEnabled: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    @ApiProperty({
        description: 'Optional reason when manually taking over (bot off)',
        example: 'Handling this VIP customer myself',
        required: false,
    })
    reason?: string;
}
