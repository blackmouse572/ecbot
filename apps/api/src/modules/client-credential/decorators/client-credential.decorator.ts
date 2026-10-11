import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from 'src/modules/client-credential/constants/client-credential.constant';
import { ClientCredentialGuard } from 'src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from 'src/modules/client-credential/guards/client-credential.policy.guard';
import { ClientCredentialEntity } from 'src/modules/client-credential/repository/entities/client-credential.entity';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';

// Protects a /client route: authenticates via x-api-key (`key:secret`) and
// populates request.__workspace and request.__clientCredential from it.
// A route over workspace data passes the abilities of the matching workspace
// route; the credential's creator must currently hold them.
export function ClientCredentialProtected(
    ...abilities: IPolicyAbility[]
): MethodDecorator {
    if (abilities.length === 0) {
        return applyDecorators(UseGuards(ClientCredentialGuard));
    }

    return applyDecorators(
        UseGuards(ClientCredentialGuard, ClientCredentialPolicyGuard),
        SetMetadata(CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY, abilities)
    );
}

export const ClientCredentialPayload = createParamDecorator(
    (_: never, ctx: ExecutionContext): ClientCredentialEntity =>
        ctx.switchToHttp().getRequest<IRequestApp>().__clientCredential
);
