import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserShortResponseDto } from '@app/modules/user/dtos/response/user.short.response.dto';

// Fuzzy name-search results for GET /:workspace/invitable: users who already
// share a workspace with the caller but aren't yet members of the target
// workspace. Never carries email — that would let any member enumerate
// arbitrary platform users' addresses by name. Only the endpoint's separate
// exact-email branch (UserShortResponseDto) returns email, for the one user
// (if any) matching the address the caller typed.
export class WorkspaceInvitableCoMemberResponseDto extends UserShortResponseDto {
    @ApiHideProperty()
    @Exclude()
    email: string;
}
