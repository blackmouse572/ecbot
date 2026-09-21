import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { NotificationDocParamsId } from '../constants/notification.doc.constant';
import { NotificationListDto } from '../dtos/notification.list.dto';
import { NotificationUnreadDto } from '../dtos/notification.unread.dto';
import { NotificationStatus } from '../enums/notification.enum';

export function NotificationSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get all notifications for the user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<NotificationListDto>('notification.list', {
            dto: NotificationListDto,
        }),
        DocRequest({
            queries: [
                {
                    name: 'status',
                    required: false,
                    enumName: 'NotificationStatus',
                    enum: NotificationStatus,
                },
            ],
        })
    );
}

export function NotificationSharedMarkAsReadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Mark notifications as read',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: NotificationDocParamsId,
        }),
        DocResponse('notification.markedAsRead')
    );
}

export function NotificationSharedMarkAllAsReadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Mark all notifications as read',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.markedAllAsRead')
    );
}

export function NotificationSharedUnreadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get unread notifications count',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.unreadCount', {
            dto: NotificationUnreadDto,
        })
    );
}
