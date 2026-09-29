import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { WORKSPACE_SLUG_MAX_LENGTH } from '../../constants/workspace.constant';

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
        maxLength: WORKSPACE_SLUG_MAX_LENGTH,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(WORKSPACE_SLUG_MAX_LENGTH)
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
