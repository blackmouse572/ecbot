import { applyDecorators, UseGuards } from '@nestjs/common';
import { NotificationGuard } from '../guard/notification.guard';

export function NotificationReceiptProtected() {
    return applyDecorators(UseGuards(NotificationGuard));
}
