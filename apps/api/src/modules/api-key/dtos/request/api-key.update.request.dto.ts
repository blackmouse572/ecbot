import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

/**
 * Shared between the create and update paths. Deliberately does NOT carry
 * `type`: create requires it and update makes it optional, and exposing it
 * through a shared parent would mix inherited @IsOptional() constraints
 * into the create DTO (see ApiKeyCreateRequestDto).
 */
export class ApiKeyNameRequestDto {
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

export class ApiKeyUpdateRequestDto extends ApiKeyNameRequestDto {
    @ApiProperty({
        description: 'Type of api key',
        example: ENUM_API_KEY_TYPE.DEFAULT,
        enum: ENUM_API_KEY_TYPE,
        required: false,
    })
    @IsOptional()
    @IsEnum(ENUM_API_KEY_TYPE)
    type?: ENUM_API_KEY_TYPE;
}
