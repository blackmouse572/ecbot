import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { UserShortResponseDto } from '@app/modules/user/dtos/response/user.short.response.dto';
import { ApiProperty, getSchemaPath, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class WorkSpaceGetResponseDto extends DatabaseDto {
    @ApiProperty({
        example: 'ae309c15-ead3-4301-9c27-017560675c87',
    })
    @IsMongoId()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        example: 'My Workspace',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiProperty({
        example: 'https://avatars.githubusercontent.com/u/49881148',
        required: false,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    avatar?: string;

    @ApiProperty({
        example: 'my-workspace',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    slug: string;

    @ApiProperty({
        example: 'f02dd263-c592-40c9-bc98-e1fab6ce587d',
        description: 'Owner user id',
        type: UserShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserShortResponseDto) }],
    })
    @IsNotEmpty()
    @Type(() => UserShortResponseDto)
    owner: UserShortResponseDto;

    @ApiProperty({
        type: [UserShortResponseDto],
        example: ['c3d49c54-07d2-4cb9-bc81-b15bfad8e771'],
        description: 'List of member user ids',
        oneOf: [{ $ref: getSchemaPath(UserShortResponseDto) }],
    })
    @IsArray()
    @Type(() => UserShortResponseDto)
    members: string[];

    @ApiProperty({
        example: '78af84b6-6621-4bcf-a1a2-5690bd429f27',
        description: 'Workspace invitation code',
        required: false,
    })
    @IsString()
    invitationCode: string;
}

export class WorkspaceGetShortResponseDto extends PickType(
    WorkSpaceGetResponseDto,
    ['id', 'name', 'avatar', 'slug'] as const
) {}
