import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class NotificationGuard implements CanActivate {
    constructor(private readonly notificationService: NotificationService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const { user } = request.user;

        const notificationId = request.params.notification as string;

        const notification =
            await this.notificationService.findOneById(notificationId);
        if (!notification) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'notification.error.notFound',
            });
        }

        if (notification.recipient.toString() !== user.toString()) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'notification.error.notFound',
            });
        }

        return true;
    }
}
