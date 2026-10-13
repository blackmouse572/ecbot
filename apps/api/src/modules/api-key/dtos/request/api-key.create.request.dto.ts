import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyNameRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';

/**
 * Declared here (not shared with the update DTO) so the create path's
 * `type` can be strictly required and reject null, without inheriting the
 * parent's @IsOptional() constraint that would let `{ "type": null }`
 * slip through validation into the NOT NULL column as a 500.
 */
class ApiKeyCreateTypeRequestDto {
    @ApiProperty({
        description: 'Type of api key',
        example: ENUM_API_KEY_TYPE.DEFAULT,
        enum: ENUM_API_KEY_TYPE,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_API_KEY_TYPE)
    type: ENUM_API_KEY_TYPE;
}

export class ApiKeyCreateRequestDto extends IntersectionType(
    ApiKeyNameRequestDto,
    ApiKeyCreateTypeRequestDto,
    PartialType(ApiKeyUpdateDateRequestDto)
) {}

export class ApiKeyCreateRawRequestDto extends ApiKeyCreateRequestDto {
    @ApiProperty({
        name: 'key',
        example: '984AOAJYkv',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @ApiProperty({
        name: 'secret',
        example: 'D83lfYWxMUCtYUfekqmV',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}

