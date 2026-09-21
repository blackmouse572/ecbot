import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../enums/account.enum';

export class AccountCreateRequestDto {
    @ApiProperty({
        description: 'Public profile URL of the channel on its platform',
        example: 'https://www.example.com',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    link: string;

    @ApiProperty({
        description: 'Display name shown in the inbox',
        example: 'Uzumaki Naruto',
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(100)
    name?: string;

    @ApiProperty({
        description:
            'Platform token. Stored encrypted — an already enveloped value is kept as-is.',
    })
    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @ApiProperty({
        description: 'Which platform this channel belongs to',
        example: 'FACEBOOK_ACCOUNT',
        enum: ENUM_ACCOUNT_TYPE,
    })
    @IsString()
    @IsEnum(ENUM_ACCOUNT_TYPE)
    type: ENUM_ACCOUNT_TYPE;

    @ApiProperty({
        description: 'Avatar URL of the channel',
        example: 'https://www.example.com/avatar.jpg',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    avatar?: string;

    @ApiProperty({
        description: 'URL-safe identifier; the account is also readable by it',
        example: 'naruto-uzumaki',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    slug?: string;

    @ApiProperty({
        description: 'Defaults to ACTIVE when omitted',
        example: ENUM_ACCOUNT_STATUS.ACTIVE,
        enum: ENUM_ACCOUNT_STATUS,
    })
    @IsEnum(ENUM_ACCOUNT_STATUS)
    @IsOptional()
    status?: ENUM_ACCOUNT_STATUS;

    @ApiProperty({
        description: 'Workspace that owns the channel',
        example: '7d5bae42-b7c1-44c8-9f00-0cf49980de4e',
    })
    @IsUUID()
    @IsNotEmpty()
    workspace: string;

    @ApiProperty({
        description: 'User credited with linking the channel',
        example: '507f1f77bcf86cd799439011',
    })
    @IsMongoId()
    @IsOptional()
    addedBy?: string;

    @ApiProperty({
        description: 'Ids of the stored cookies used to reach the platform',
    })
    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    cookies?: Array<string>;

    @ApiProperty({
        description: 'Ids of the proxies requests to the platform go through',
    })
    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    proxies?: Array<string>;
}
