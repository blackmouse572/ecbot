import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import {
    WORKSPACE_POLICY_ABILITY_META_KEY,
    WORKSPACE_POLICY_ROLE_META_KEY,
} from 'src/modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from 'src/modules/workspace/guards/workspace.guard';
import { WorkspacePolicyGuard } from 'src/modules/workspace/guards/workspace.policy.guard';

export function WorkspacePolicyAbilityProtected(
    ...handlers: IPolicyAbility[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        UseGuards(WorkspacePolicyGuard),
        SetMetadata(WORKSPACE_POLICY_ABILITY_META_KEY, handlers)
    );
}

export function WorkspacePolicyRoleProtected(
    ...roles: ENUM_POLICY_ROLE_TYPE[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        UseGuards(WorkspacePolicyGuard),
        SetMetadata(WORKSPACE_POLICY_ROLE_META_KEY, roles)
    );
}

export function WorkspacePolicyProtected(
    abilities?: IPolicyAbility[],
    roles?: ENUM_POLICY_ROLE_TYPE[]
): MethodDecorator {
    const decorators = [
        UseGuards(WorkspaceGuard),
        UseGuards(WorkspacePolicyGuard),
    ];

    if (abilities && abilities.length > 0) {
        decorators.push(
            SetMetadata(WORKSPACE_POLICY_ABILITY_META_KEY, abilities)
        );
    }

    if (roles && roles.length > 0) {
        decorators.push(SetMetadata(WORKSPACE_POLICY_ROLE_META_KEY, roles));
    }

    return applyDecorators(...decorators);
}
