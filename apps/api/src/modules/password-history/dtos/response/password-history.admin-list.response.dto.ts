import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';

// Global admin password-history list: the `user` and `by` FKs are populated so the
// cross-user table can show whose password changed and who changed it. They are
// TYPED as UserMetaResponseDto, but `@Type` alone does not strip extraneous entity
// fields — the credential-safe narrowing (dropping password/salt) is enforced in
// `PasswordHistoryService.mapAdminList` via `excludeExtraneousValues`. The sibling
// `mapList` path guards differently (it collapses its `user` to the FK id). Either
// way, serialising a raw populated UserEntity through a DTO would leak — any new
// mapper for these DTOs must narrow the relations with the same care.
export class PasswordHistoryAdminListResponseDto extends OmitType(
    PasswordHistoryListResponseDto,
    ['user', 'by'] as const
) {
    @ApiProperty({ type: UserMetaResponseDto, required: true })
    @Type(() => UserMetaResponseDto)
    user: UserMetaResponseDto;

    @ApiProperty({ type: UserMetaResponseDto, required: true })
    @Type(() => UserMetaResponseDto)
    by: UserMetaResponseDto;
}
