import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from '@app/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationReceiptProtected } from '../decorators/notification.decorator';
import {
    NotificationSharedListDoc,
    NotificationSharedMarkAllAsReadDoc,
    NotificationSharedMarkAsReadDoc,
    NotificationSharedPushPublicKeyDoc,
    NotificationSharedPushSubscribeDoc,
    NotificationSharedPushUnsubscribeDoc,
    NotificationSharedUnreadDoc,
} from '../docs/notification.shared.doc';
import { NotificationPushSubscribeRequestDto } from '../dtos/request/notification.push-subscribe.request.dto';
import { NotificationPushUnsubscribeRequestDto } from '../dtos/request/notification.push-unsubscribe.request.dto';
import { NotificationPushPublicKeyResponseDto } from '../dtos/response/notification.push-public-key.response.dto';
import { NotificationUnreadDto } from '../dtos/notification.unread.dto';
import { NotificationStatus } from '../enums/notification.enum';
import { NotificationParsePipe } from '../pipes/notification.pipe';
import { NotificationDoc } from '../repository/entities/notification.entity';
import { NotificationPushService } from '../services/notification.push.service';
import { NotificationService } from '../services/notification.service';

@ApiTags('modules.user.notification')
@Controller({
    version: '1',
    path: '/notification',
})
export class NotificationSharedController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly paginationService: PaginationService,
        private readonly notificationPushService: NotificationPushService
    ) {}

    @NotificationSharedListDoc()
    @ResponsePaging('notification.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity,
        @PaginationQuery({
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _limit, _offset, _order, _search }: PaginationListDto,
        @Query('status') status: string
    ) {
        // The bell shows read and unread history; archived and dismissed
        // rows stay out unless asked for by status.
        const find: Record<string, any> = {
            ..._search,
            status: status || {
                $nin: [
                    NotificationStatus.ARCHIVED,
                    NotificationStatus.DISMISSED,
                ],
            },
        };

        const notifications = await this.notificationService.findAllByRecipient(
            user.id,
            find,
            { paging: { limit: _limit, offset: _offset }, order: _order }
        );

        const total: number = await this.notificationService.getTotalByUser(
            user.id,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: notifications,
        };
    }

    @NotificationSharedListDoc()
    @ResponsePaging('notification.unreadList')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list/unread')
    async listUnread(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity,
        @PaginationQuery({
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _limit, _offset, _order }: PaginationListDto
    ) {
        const find: Record<string, any> = {
            status: NotificationStatus.UNREAD,
        };

        const notifications = await this.notificationService.findAllByRecipient(
            user.id,
            find,
            { paging: { limit: _limit, offset: _offset }, order: _order }
        );

        const total: number = await this.notificationService.getTotalByUser(
            user.id,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: notifications,
        };
    }

    @NotificationSharedMarkAsReadDoc()
    @Response('notification.markAsRead')
    @NotificationReceiptProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/read/:notification')
    async markAsRead(
        @Param('notification', RequestRequiredPipe, NotificationParsePipe)
        notification: NotificationDoc
    ) {
        const data = await this.notificationService.markAsRead(notification.id);
        return { data };
    }

    @NotificationSharedMarkAllAsReadDoc()
    @Response('notification.markAllAsRead')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/read')
    async markAllAsRead(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity
    ) {
        const data = await this.notificationService.markAllAsReadByRecipient(
            user.id
        );
        return { data };
    }

    @NotificationSharedUnreadDoc()
    @Response('notification.unread-count')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/unread')
    async unread(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity
    ) {
        const count = await this.notificationService.getUnreadCount(user.id);
        const unreadDto: NotificationUnreadDto = {
            count,
        };
        return { data: unreadDto };
    }

    @NotificationSharedPushPublicKeyDoc()
    @Response('notification.pushPublicKey')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/push/public-key')
    async pushPublicKey(): Promise<{
        data: NotificationPushPublicKeyResponseDto;
    }> {
        return {
            data: { publicKey: this.notificationPushService.publicKey() },
        };
    }

    @NotificationSharedPushSubscribeDoc()
    @Response('notification.pushSubscribe')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/push/subscribe')
    async pushSubscribe(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity,
        @Body() body: NotificationPushSubscribeRequestDto,
        @Headers('user-agent') userAgent?: string
    ): Promise<void> {
        await this.notificationPushService.subscribe(user.id, body, userAgent);
    }

    @NotificationSharedPushUnsubscribeDoc()
    @Response('notification.pushUnsubscribe')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/push/unsubscribe')
    async pushUnsubscribe(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity,
        @Body() { endpoint }: NotificationPushUnsubscribeRequestDto
    ): Promise<void> {
        await this.notificationPushService.unsubscribe(user.id, endpoint);
    }
}
