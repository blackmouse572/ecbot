import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CustomerSystemSetFieldRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty()
    key: string;

    @IsString()
    @MaxLength(2000)
    @ApiProperty()
    value: string;
}
