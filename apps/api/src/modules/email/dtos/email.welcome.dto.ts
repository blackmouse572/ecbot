import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EmailWelcomeDto {
    @ApiProperty({ required: false, example: 'vi' })
    @IsOptional()
    @IsString()
    language?: string;
}
