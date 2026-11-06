import { NotFoundException } from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';

/**
 * The one answer for "no such workspace" and "not your workspace". A caller
 * who is not a member must not be able to tell an existing slug from a
 * missing one, so every workspace guard throws this same 404.
 */
export function workspaceNotFoundException(
    workspaceIdOrSlug: string | string[]
): NotFoundException {
    return new NotFoundException({
        statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
        message: 'workspace.error.memberNotFound',
        _error: `User is not a member of workspace ${workspaceIdOrSlug}`,
    });
}
