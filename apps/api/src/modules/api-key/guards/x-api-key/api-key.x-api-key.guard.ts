import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TtlCache } from 'src/common/utils/ttl-cache.util';
import {
    API_KEY_CACHE_MAX_ENTRIES,
    API_KEY_CACHE_TTL_MS,
} from 'src/modules/api-key/constants/api-key.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';

@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    private readonly header: string;
    private readonly cache = new TtlCache<ApiKeyEntity>(
        API_KEY_CACHE_TTL_MS,
        API_KEY_CACHE_MAX_ENTRIES
    );

    constructor(
        private readonly configService: ConfigService,
        private readonly apiKeyService: ApiKeyService,
        private readonly helperDateService: HelperDateService
    ) {
        this.header = this.configService.get<string>('auth.xApiKey.header');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const xApiKey: string = request.headers[
            `${this.header.toLowerCase()}`
        ] as string;
        if (!xApiKey) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                message: 'apiKey.error.xApiKey.required',
            });
        }

        const xApiKeyArr: string[] = xApiKey.split(':');
        if (xApiKeyArr.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        const key = xApiKeyArr[0];
        const secret = xApiKeyArr[1];
        const hashed = await this.apiKeyService.createHashApiKey(key, secret);
        const cached = this.cache.get(hashed);
        const apiKey = cached ?? (await this.verify(hashed, key));

        const today = this.helperDateService.create();
        if (apiKey.startDate && apiKey.endDate) {
            if (today > apiKey.endDate) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED,
                    message: 'apiKey.error.xApiKey.expired',
                });
            } else if (today < apiKey.startDate) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                    message: 'apiKey.error.xApiKey.inactive',
                });
            }
        }

        // Cached after the date check passes, so an expired key is never kept,
        // and only on a fresh read, so the entry still expires under load.
        if (!cached) this.cache.set(hashed, apiKey);
        request.apiKey = {
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key,
            type: apiKey.type,
        };

        return true;
    }

    private async verify(hashed: string, key: string): Promise<ApiKeyEntity> {
        const apiKey: ApiKeyEntity =
            await this.apiKeyService.findOneByActiveKey(key);

        if (!apiKey) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                message: 'apiKey.error.xApiKey.notFound',
            });
        } else if (!apiKey.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                message: 'apiKey.error.xApiKey.inactive',
            });
        }

        const validateApiKey: boolean =
            await this.apiKeyService.validateHashApiKey(hashed, apiKey.hash);
        if (!validateApiKey) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        return apiKey;
    }
}
