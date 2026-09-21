import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { NotificationDoc } from '../repository/entities/notification.entity';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class NotificationParsePipe implements PipeTransform {
    constructor(private readonly notificationService: NotificationService) {}

    async transform(value: string): Promise<NotificationDoc> {
        const notification: NotificationDoc =
            await this.notificationService.findOneById(value);
        if (!notification) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'notification.error.notFound',
            });
        }

        return notification;
    }
}
