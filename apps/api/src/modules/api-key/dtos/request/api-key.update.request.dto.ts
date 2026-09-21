import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApiKeyUpdateRequestDto {
    @ApiProperty({
        description: 'Api Key name',
        example: 'Block - Lubowitz',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;
}
