import { ConflictException } from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';

/**
 * The built-in Member role is what a role-less invitation and an approved
 * join request grant. An owner can deactivate it; then adding a member fails
 * with this instead of a 500 (and never falls back to Admin).
 */
export function defaultMemberRoleMissingException(): ConflictException {
    return new ConflictException({
        statusCode:
            ENUM_WORKSPACE_STATUS_CODE_ERROR.DEFAULT_MEMBER_ROLE_MISSING,
        message: 'workspace.error.defaultMemberRoleMissing',
    });
}
