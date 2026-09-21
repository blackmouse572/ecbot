import { applyDecorators, UseGuards } from '@nestjs/common';
import { ClientCredentialGuard } from 'src/modules/client-credential/guards/client-credential.guard';

// Protects a /client route: authenticates via x-api-key (`key:secret`) and
// populates request.__workspace from the credential.
export function ClientCredentialProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ClientCredentialGuard));
}
