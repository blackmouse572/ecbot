import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CustomerTagCreateRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty()
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(16)
    @ApiProperty({ required: false, nullable: true })
    emoji?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    @ApiProperty({ required: false, nullable: true })
    description?: string | null;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ required: false, default: false })
    triggersHandoff?: boolean;
}
