import { UserProfileResponseDto } from '@app/modules/user/dtos/response/user.profile.response.dto';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { WorkspaceMemberGetProfileResponseDto } from './workspace-member.get.response.dto';

export class WorkspaceGetProfileResponseDto extends UserProfileResponseDto {
    @ApiProperty({
        required: false,
        type: WorkspaceMemberGetProfileResponseDto,
        oneOf: [{ $ref: getSchemaPath(WorkspaceMemberGetProfileResponseDto) }],
    })
    @Type(() => WorkspaceMemberGetProfileResponseDto)
    workspaceMember?: WorkspaceMemberGetProfileResponseDto;
    @ApiProperty({
        required: true,
        type: Boolean,
        description: 'Whether the profile owner owns this workspace',
    })
    isOwner: boolean;
}
