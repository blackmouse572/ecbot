import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class EmailSendDto {
    @ApiProperty({ required: true, example: 'Amber Hettinger' })
    @IsString()
    name: string;

    @ApiProperty({
        required: true,
        example: 'Nikko.Metz@gmail.com',
    })
    @IsEmail()
    email: string;
}
