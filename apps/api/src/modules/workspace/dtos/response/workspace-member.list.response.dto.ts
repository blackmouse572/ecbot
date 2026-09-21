import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { RoleListResponseDto } from '@app/modules/role/dtos/response/role.list.response.dto';
import { UserShortResponseDto } from '@app/modules/user/dtos/response/user.short.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// class-transformer needs a class reference, not just an interface — a
// named factory reads better here than a second inline arrow next to `user`.
const roleListType = (): typeof RoleListResponseDto => RoleListResponseDto;

export class WorkspaceMemberListResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        type: [String],
        description: 'Workspace ID',
    })
    workspace: string;

    @ApiProperty({
        required: true,
        type: UserShortResponseDto,
        description: 'The member user',
    })
    @Type(() => UserShortResponseDto)
    user: UserShortResponseDto;

    @ApiProperty({
        required: true,
        type: RoleListResponseDto,
    })
    @Type(roleListType)
    role: RoleListResponseDto;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'Timestamp the member joined the workspace',
    })
    joinedAt?: Date;
}
