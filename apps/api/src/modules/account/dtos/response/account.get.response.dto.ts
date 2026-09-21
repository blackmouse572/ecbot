import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../enums/account.enum';
import { Expose } from 'class-transformer';

/**
 * Shape every account read returns. Secrets (`accessToken`, `config`) are
 * absent by construction — only `@Expose()`d fields survive serialization.
 */
export class AccountGetResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Public profile URL of the channel on its platform',
        example: 'https://example.com/profile',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @Expose()
    link: string;

    @ApiProperty({
        description: 'Display name shown in the inbox',
        example: 'Uzumaki Naruto',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    @MinLength(1)
    @Expose()
    name?: string;

    @ApiProperty({
        description: 'URL-safe identifier; reads accept it in place of the id',
        example: 'uzumaki-naruto',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @MinLength(1)
    @Expose()
    slug: string;

    @ApiProperty({
        description: 'Avatar URL of the channel',
        example: 'https://example.com/avatar.jpg',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    @Expose()
    avatar?: string;

    @ApiProperty({
        description: 'BLOCKED means the platform token stopped working',
        example: ENUM_ACCOUNT_STATUS.ACTIVE,
        enum: ENUM_ACCOUNT_STATUS,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_ACCOUNT_STATUS)
    @Expose()
    status: string;

    @ApiProperty({
        description: 'Which platform this channel belongs to',
        example: ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
        enum: ENUM_ACCOUNT_TYPE,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_ACCOUNT_TYPE)
    @Expose()
    type: ENUM_ACCOUNT_TYPE;

    @ApiProperty({
        description: 'Workspace that owns the channel',
        example: '930ed670-6dfc-4a71-ae75-39e7873ae708',
    })
    @IsUUID()
    @IsNotEmpty()
    @Expose()
    workspace: string;
}
