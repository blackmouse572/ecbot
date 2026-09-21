import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { IPolicyAbility } from '@app/modules/policy/interfaces/policy.interface';
import {
    WORKSPACE_EXCLUDE_OWNER_META_KEY,
    WORKSPACE_POLICY_ABILITY_META_KEY,
} from '../constants/workspace.constant';
import { WorkspaceGuard } from '../guards/workspace.guard';
import { WorkspaceMemberGuard } from '../guards/workspace.member.guard';
import { WorkspaceOwnerGuard } from '../guards/workspace.owner.guard';
import { WorkspacePolicyGuard } from '../guards/workspace.policy.guard';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';

export function WorkspaceMemberProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        SetMetadata(WORKSPACE_EXCLUDE_OWNER_META_KEY, true),
        UseGuards(WorkspaceMemberGuard)
    );
}

export function WorkspaceOwnerProtected(): ClassDecorator & MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        UseGuards(WorkspaceOwnerGuard)
    );
}

export function WorkspaceMemberOrOwnerProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        UseGuards(WorkspaceMemberGuard)
    );
}

export function WorkspaceScopedProtected(
    ...handlers: [IPolicyAbility, ...IPolicyAbility[]]
): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        UseGuards(WorkspaceMemberGuard),
        UseGuards(WorkspacePolicyGuard),
        SetMetadata(WORKSPACE_POLICY_ABILITY_META_KEY, handlers)
    );
}

export const WorkspacePayload = createParamDecorator(
    <T = WorkspaceEntity>(_: never, ctx: ExecutionContext): T => {
        const { __workspace } = ctx.switchToHttp().getRequest<IRequestApp>();
        return __workspace as T;
    }
);

export const GetClientOrigin = createParamDecorator(
    (_: never, ctx: ExecutionContext) => {
        const {
            headers: { origin },
        } = ctx.switchToHttp().getRequest();
        return origin;
    }
);

// Re-export workspace policy decorators for convenience
export {
    WorkspacePolicyAbilityProtected,
    WorkspacePolicyProtected,
    WorkspacePolicyRoleProtected,
} from './workspace.policy.decorator';
