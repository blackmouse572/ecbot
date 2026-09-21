import { ApiProperty, getSchemaPath, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';

export class RoleUpdateRequestDto {
    @ApiProperty({
        description: 'Description of role',
        example: 'Adsum vere perferendis numquam.',
        required: false,
        maxLength: 500,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        description: 'Representative for role type',
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,
        enum: ENUM_POLICY_ROLE_TYPE,
    })
    @IsEnum(ENUM_POLICY_ROLE_TYPE)
    @IsNotEmpty()
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        required: true,
        description: 'Permission list of role',
        isArray: true,
        type: RolePermissionDto,
        oneOf: [{ $ref: getSchemaPath(RolePermissionDto) }],
    })
    @Type(() => RolePermissionDto)
    @IsNotEmpty()
    @ValidateNested()
    @IsArray()
    permissions: RolePermissionDto[];
}

export class RoleUpdateWorkspaceRequestDto extends PickType(
    RoleUpdateRequestDto,
    ['permissions', 'description']
) {}
