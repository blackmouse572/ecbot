import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ClientCredentialGuard } from 'src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialEntity } from 'src/modules/client-credential/repository/entities/client-credential.entity';

// Protects a /client route: authenticates via x-api-key (`key:secret`) and
// populates request.__workspace and request.__clientCredential from it.
export function ClientCredentialProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ClientCredentialGuard));
}

export const ClientCredentialPayload = createParamDecorator(
    (_: never, ctx: ExecutionContext): ClientCredentialEntity =>
        ctx.switchToHttp().getRequest<IRequestApp>().__clientCredential
);
