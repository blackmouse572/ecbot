import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';

export class RoleGetResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Name of role',
        example: 'Human Research Agent',
        required: true,
    })
    @Expose()
    name: string;

    @ApiProperty({
        description: 'Description of role',
        example: 'Subnecto volaticus xiphias ago.',
        required: false,
        maxLength: 500,
    })
    @Expose()
    description?: string;

    @ApiProperty({
        description: 'Active flag of role',
        example: true,
        required: true,
    })
    @Expose()
    isActive: boolean;

    @ApiProperty({
        description: 'Representative for role type',
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,

        enum: ENUM_POLICY_ROLE_TYPE,
    })
    @Expose()
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        type: RolePermissionDto,
        oneOf: [{ $ref: getSchemaPath(RolePermissionDto) }],
        required: true,

        isArray: true,
        default: [],
    })
    @Expose()
    @Type(() => RolePermissionDto)
    permissions: RolePermissionDto[];
}
