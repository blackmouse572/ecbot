import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { NotificationDocParamsId } from '../constants/notification.doc.constant';
import { NotificationListDto } from '../dtos/notification.list.dto';
import { NotificationPushSubscribeRequestDto } from '../dtos/request/notification.push-subscribe.request.dto';
import { NotificationPushUnsubscribeRequestDto } from '../dtos/request/notification.push-unsubscribe.request.dto';
import { NotificationPushPublicKeyResponseDto } from '../dtos/response/notification.push-public-key.response.dto';
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

export function NotificationSharedPushPublicKeyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get the Web Push public key (null when push is off)',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.pushPublicKey', {
            dto: NotificationPushPublicKeyResponseDto,
        })
    );
}

export function NotificationSharedPushSubscribeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Send my notifications to this browser as push',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: NotificationPushSubscribeRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.pushSubscribe')
    );
}

export function NotificationSharedPushUnsubscribeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Stop push notifications on this browser',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: NotificationPushUnsubscribeRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.pushUnsubscribe')
    );
}
