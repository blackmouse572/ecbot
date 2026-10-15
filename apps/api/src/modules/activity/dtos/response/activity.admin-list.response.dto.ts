import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';
import { ActivityAdminWorkspaceResponseDto } from './activity.admin-workspace.response.dto';
import { ActivityListResponseDto } from './activity.list.response.dto';

// Global admin activity list: `user`, `by` and `workspace` are populated so one
// table can show who acted, on whose account, and where. Each relation is
// narrowed in `ActivityService.mapAdminList` with `excludeExtraneousValues`, so
// credentials and the invitation code never leave the service.
export class ActivityAdminListResponseDto extends OmitType(
    ActivityListResponseDto,
    ['user', 'by'] as const
) {
    @ApiProperty({ type: UserMetaResponseDto, required: true })
    @Type(() => UserMetaResponseDto)
    user: UserMetaResponseDto;

    @ApiProperty({ type: UserMetaResponseDto, required: true })
    @Type(() => UserMetaResponseDto)
    by: UserMetaResponseDto;

    @ApiProperty({ type: ActivityAdminWorkspaceResponseDto, required: false })
    @Type(() => ActivityAdminWorkspaceResponseDto)
    workspace?: ActivityAdminWorkspaceResponseDto;

    @ApiProperty({ required: false, example: '203.0.113.7' })
    ipAddress?: string;

    @ApiProperty({ required: false, example: 'Mozilla/5.0' })
    userAgent?: string;
}
