import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class WorkSpaceCreateRequestDto {
    @ApiProperty({
        example: 'My WorkSpace',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiProperty({
        example: 'my-workspace',
        maxLength: 255,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    slug?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(255)
    handler?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        format: 'binary',
        description: 'Image file to upload',
    })
    @IsOptional()
    image?: string;
}
