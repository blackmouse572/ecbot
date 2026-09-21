import { RoleGetResponseDto } from '@app/modules/role/dtos/response/role.get.response.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { WorkspaceMemberListResponseDto } from './workspace-member.list.response.dto';

export class WorkspaceMemberGetResponseDto extends WorkspaceMemberListResponseDto {}

export class WorkspaceMemberGetProfileResponseDto extends OmitType(
    WorkspaceMemberListResponseDto,
    ['user', 'workspace', 'role']
) {
    @ApiProperty({
        required: true,
        type: RoleGetResponseDto,
    })
    @Type(() => RoleGetResponseDto)
    role: RoleGetResponseDto;
}
