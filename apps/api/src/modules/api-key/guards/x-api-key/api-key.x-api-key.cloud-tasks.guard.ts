import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';

/**
 * Narrows a SYSTEM-key route to the one key CloudTasksQueueClient sends
 * (`CLOUD_TASKS_SYSTEM_API_KEY`, `key:secret`). Other SYSTEM keys (the AI
 * service's, the generic seeded one) must not reach task callbacks: the
 * inbound-event task writes into any workspace's inbox, past webhook
 * signature checks. Runs after ApiKeyXApiKeyGuard has validated the secret.
 */
@Injectable()
export class ApiKeyXApiKeyCloudTasksGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const { apiKey } = context.switchToHttp().getRequest<IRequestApp>();
        const [expectedKey] = (
            this.configService.get<string>('cloudTasks.systemApiKey') ?? ''
        ).split(':');

        if (!expectedKey || apiKey?.key !== expectedKey) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                message: 'apiKey.error.xApiKey.forbidden',
            });
        }
        return true;
    }
}
