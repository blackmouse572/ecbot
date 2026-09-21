import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';
import { SessionListResponseDto } from './session.list.response.dto';

// Global admin session list: the `user` FK is populated to id/email/name so the
// cross-user table can show who each session belongs to.
export class SessionAdminListResponseDto extends OmitType(
    SessionListResponseDto,
    ['user'] as const
) {
    @ApiProperty({ type: UserMetaResponseDto, required: true })
    @Type(() => UserMetaResponseDto)
    user: UserMetaResponseDto;

    @ApiProperty({
        required: true,
        description:
            'Whether this row is the session the requesting admin is currently using',
        default: false,
    })
    isCurrent: boolean;
}
