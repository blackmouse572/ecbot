import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AccountClientTelegramRequestDto {
    @ApiProperty({
        description: 'The bot token BotFather gave, e.g. 123456:ABC-DEF...',
        example: '123456789:AAF1x2y3z4ExampleTokenOnly',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    botToken: string;
}
