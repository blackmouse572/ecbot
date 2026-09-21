import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR } from 'src/modules/client-credential/enums/client-credential.status-code.enum';
import { ClientCredentialService } from 'src/modules/client-credential/services/client-credential.service';

// Authenticates a 3rd-party request on the /client surface via x-api-key
// (value = `key:secret`) and derives the owning Workspace from the credential
// itself — there is no :workspace URL param. See ADR-0012.
@Injectable()
export class ClientCredentialGuard implements CanActivate {
    private readonly header: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly clientCredentialService: ClientCredentialService,
        private readonly helperDateService: HelperDateService
    ) {
        this.header = this.configService.get<string>('auth.xApiKey.header');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const xApiKey = request.headers[this.header.toLowerCase()] as string;

        if (!xApiKey) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                message: 'clientCredential.error.xApiKey.required',
            });
        }

        const parts = xApiKey.split(':');
        if (parts.length !== 2) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'clientCredential.error.xApiKey.invalid',
            });
        }

        const [key, secret] = parts;
        const credential =
            await this.clientCredentialService.findOneByActiveKey(key, {
                populate: ['workspace'],
            });

        if (!credential) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                message: 'clientCredential.error.xApiKey.notFound',
            });
        }

        if (!credential.isActive) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                message: 'clientCredential.error.xApiKey.inactive',
            });
        }

        const today = this.helperDateService.create();
        if (credential.startDate && credential.endDate) {
            if (today > credential.endDate) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_EXPIRED,
                    message: 'clientCredential.error.xApiKey.expired',
                });
            }
            if (today < credential.startDate) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                    message: 'clientCredential.error.xApiKey.inactive',
                });
            }
        }

        const hashed = await this.clientCredentialService.createHash(
            key,
            secret
        );
        const valid = await this.clientCredentialService.validateHash(
            hashed,
            credential.hash
        );
        if (!valid) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_CLIENT_CREDENTIAL_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'clientCredential.error.xApiKey.invalid',
            });
        }

        // Derive tenant from the credential — downstream reads via @WorkspacePayload().
        request.__workspace = credential.workspace;

        return true;
    }
}
