import {
    IDatabaseCreateOptions,
    IDatabaseGetTotalOptions,
} from '@app/common/database/interfaces/database.interface';
import { MessageService } from '@app/common/message/services/message.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { IPaginationQueryOptions } from '../../../common/pagination/interfaces/pagination.interface';
import { PaginationService } from '../../../common/pagination/services/pagination.service';
import { NotificationCreateDto } from '../dtos/notification.create.dto';
import { NotificationListDto } from '../dtos/notification.list.dto';
import { NotificationUpdateDto } from '../dtos/notification.update.dto';
import {
    NotificationPriority,
    NotificationStatus,
    NotificationType,
} from '../enums/notification.enum';
import { NotificationEntity } from '../repository/entities/notification.entity';
import { NotificationRepository } from '../repository/repositories/notification.repository';

@Injectable()
export class NotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly paginationService: PaginationService,
        private readonly messageService: MessageService
    ) {}

    async findAll(find?: Record<string, any>): Promise<NotificationEntity[]> {
        return this.notificationRepository.find(find || {}, {
            populate: ['recipient', 'sender'],
        });
    }

    async findAllByWorkspace(
        workspaceId: string,
        _find?: Record<string, any>
    ): Promise<NotificationEntity[]> {
        // Filter by metadata data containing workspace info
        return this.notificationRepository.find(
            {
                workspace: workspaceId,
            },
            { populate: ['recipient', 'sender'] }
        );
    }

    async findAllByRecipient(
        recipientId: string,
        _find?: Record<string, any>
    ): Promise<NotificationEntity[]> {
        return this.notificationRepository.findByRecipient(recipientId);
    }

    async findAllWithPagination(
        find: NotificationListDto,
        options: IPaginationQueryOptions
    ): Promise<{
        data: NotificationEntity[];
        totalData: number;
        totalPage: number;
    }> {
        const page = this.paginationService.page(
            options.defaultPerPage ? 1 : undefined
        );
        const perPage = this.paginationService.perPage(options.defaultPerPage);
        const offset = this.paginationService.offset(page, perPage);

        const filter: Record<string, any> = {};
        if (find.type) filter.type = find.type;
        if (find.status) filter.status = find.status;
        if (find.priority) filter.priority = find.priority;
        if (find.recipient) filter.recipient = find.recipient;
        if (find.sender) filter.sender = find.sender;

        const notifications = await this.notificationRepository.find(filter, {
            limit: perPage,
            offset,
            order: find._order
                ? { [find._order.field]: find._order.direction }
                : undefined,
            populate: ['recipient', 'sender'],
        });

        const totalData = await this.notificationRepository.getTotal(filter);
        const totalPage = this.paginationService.totalPage(totalData, perPage);

        return {
            data: notifications,
            totalData,
            totalPage,
        };
    }

    async findOneById(id: string): Promise<NotificationEntity> {
        return this.notificationRepository.findOne({ id });
    }

    async create(
        dto: NotificationCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<NotificationEntity> {
        const notification = {
            ...dto,
            scheduledAt: dto.scheduledAt
                ? new Date(dto.scheduledAt)
                : undefined,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        };

        return this.notificationRepository.create<any>(notification, options);
    }

    async update(
        id: string,
        dto: NotificationUpdateDto,
        options?: IDatabaseCreateOptions
    ): Promise<NotificationEntity> {
        const notification = await this.findOneById(id);
        if (!notification) {
            throw new NotFoundException({
                message: 'notification.error.notFound',
                statusCode: 404,
            });
        }

        if (dto.status === NotificationStatus.READ) {
            notification.readAt = new Date();
        } else if (dto.status === NotificationStatus.ARCHIVED) {
            notification.archivedAt = new Date();
        }

        return this.notificationRepository.updateEntity(
            { id: id },
            notification,
            options
        );
    }

    async markAsRead(id: string): Promise<NotificationEntity> {
        return this.notificationRepository.markAsRead(id);
    }

    async markAsArchived(id: string): Promise<NotificationEntity> {
        return this.notificationRepository.markAsArchived(id);
    }

    async delete(id: string): Promise<NotificationEntity> {
        return this.notificationRepository.softDelete(
            await this.findOneById(id),
            {}
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.notificationRepository.getTotal(find, options);
    }

    async getTotalByUser(
        userId: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        const _find = {
            ...find,
            recipient: userId,
        };
        return this.notificationRepository.getTotal(_find, options);
    }

    async getUnreadCount(recipientId: string): Promise<number> {
        return this.notificationRepository.countUnreadByRecipient(recipientId);
    }

    async getUnreadCountByWorkspace(workspaceId: string): Promise<number> {
        return this.notificationRepository.getTotal({
            workspace: workspaceId,
            status: NotificationStatus.UNREAD,
        });
    }
    async markAllAsReadByRecipient(recipientId: string): Promise<void> {
        await this.notificationRepository.updateMany(
            {
                recipient: recipientId,
                status: NotificationStatus.UNREAD,
            },
            {
                status: NotificationStatus.READ,
                readAt: new Date(),
            }
        );
    }

    async deleteExpiredNotifications(): Promise<void> {
        const now = new Date();
        await this.notificationRepository.updateMany(
            {
                expiresAt: { $lt: now },
                deleted: false,
            },
            { deleted: true, deletedAt: now }
        );
    }

    async createWorkspaceInvitation(
        recipientId: string,
        senderId: string,
        workspace: { id: string; name: string; invitationLink: string }
    ): Promise<NotificationEntity> {
        return this.create({
            title: this.messageService.setMessage(
                'notification.invitation.title'
            ),
            message: this.messageService.setMessage(
                'notification.invitation.message',
                { properties: { workspaceName: workspace.name } }
            ),
            type: NotificationType.INVITATION,
            recipient: recipientId,
            sender: senderId,
            metadata: {
                actionUrl: workspace.invitationLink,
                actionText: this.messageService.setMessage(
                    'notification.invitation.accept'
                ),
                data: {
                    workspace: {
                        id: workspace.id,
                    },
                    inviterId: senderId,
                },
            },
        });
    }

    async createWorkspaceActivity(
        recipientIds: string[],
        senderId: string,
        workspace: { id: string; name: string },
        activityMessage: string
    ): Promise<NotificationEntity[]> {
        const notifications = await Promise.all(
            recipientIds.map(recipientId =>
                this.create({
                    title: this.messageService.setMessage(
                        'notification.activity.title'
                    ),
                    message: activityMessage,
                    type: NotificationType.ACTIVITY,
                    recipient: recipientId,
                    sender: senderId,
                    metadata: {
                        actionUrl: `/workspace/${workspace.id}`,
                        actionText: this.messageService.setMessage(
                            'notification.activity.actionText'
                        ),
                        data: {
                            activityType: 'workspace_update',
                            workspace: {
                                id: workspace.id,
                            },
                        },
                    },
                })
            )
        );

        return notifications;
    }

    async createAccountBlocked(
        recipientId: string,
        account: { id: string; name: string },
        reconnectUrl: string
    ): Promise<NotificationEntity> {
        return this.create({
            title: this.messageService.setMessage(
                'notification.accountBlocked.title'
            ),
            message: this.messageService.setMessage(
                'notification.accountBlocked.message',
                { properties: { accountName: account.name } }
            ),
            type: NotificationType.WARNING,
            recipient: recipientId,
            metadata: {
                actionUrl: reconnectUrl,
                actionText: this.messageService.setMessage(
                    'notification.accountBlocked.actionText'
                ),
                data: {
                    account: { id: account.id },
                },
            },
        });
    }

    async createTokenCredited(
        recipientId: string,
        workspaceId: string,
        data: { workspaceName: string; amount: number; note?: string }
    ): Promise<NotificationEntity> {
        return this.create({
            title: this.messageService.setMessage(
                'notification.tokenCredited.title'
            ),
            message: this.messageService.setMessage(
                'notification.tokenCredited.message',
                {
                    // Raw number, not `toLocaleString('en-US')` — the message is
                    // rendered per recipient language, and hardcoding English
                    // grouping put "1,000,000" in front of Vietnamese owners.
                    properties: {
                        workspaceName: data.workspaceName,
                        amount: data.amount,
                    },
                }
            ),
            type: NotificationType.SUCCESS,
            priority: NotificationPriority.MEDIUM,
            recipient: recipientId,
            workspace: workspaceId,
            metadata: {
                actionUrl: '/usage',
                actionText: this.messageService.setMessage(
                    'notification.tokenCredited.actionText'
                ),
                data: { amount: data.amount, note: data.note },
            },
        });
    }

    async createLowTokenBalance(
        recipientId: string,
        workspaceId: string,
        data: { workspaceName: string; usedPercent: number }
    ): Promise<NotificationEntity> {
        return this.create({
            title: this.messageService.setMessage(
                'notification.lowTokenBalance.title'
            ),
            message: this.messageService.setMessage(
                'notification.lowTokenBalance.message',
                { properties: { ...data } }
            ),
            type: NotificationType.WARNING,
            priority: NotificationPriority.HIGH,
            recipient: recipientId,
            workspace: workspaceId,
            metadata: {
                actionUrl: '/usage',
                actionText: this.messageService.setMessage(
                    'notification.lowTokenBalance.actionText'
                ),
                data: { usedPercent: data.usedPercent },
            },
        });
    }

    /**
     * Billing was never seeded, so workspace creation could not attach a plan
     * and `TokenGuardService` will refuse every turn. The operator log names
     * the fix, but only staff see it — this is the owner's side of that.
     */
    async createWorkspaceNoPlan(
        recipientId: string,
        workspaceId: string,
        workspaceName: string
    ): Promise<NotificationEntity> {
        return this.create({
            title: this.messageService.setMessage(
                'notification.workspaceNoPlan.title'
            ),
            message: this.messageService.setMessage(
                'notification.workspaceNoPlan.message',
                { properties: { workspaceName } }
            ),
            type: NotificationType.WARNING,
            priority: NotificationPriority.HIGH,
            recipient: recipientId,
            workspace: workspaceId,
            metadata: {
                actionText: this.messageService.setMessage(
                    'notification.workspaceNoPlan.actionText'
                ),
            },
        });
    }

    async createRequestToJoinWorkspace(
        recipientId: string,
        senderId: string,
        data: {
            requestId: string;
            workspace: { id: string; name: string };
            requestorName: string;
        }
    ): Promise<NotificationEntity> {
        const title = this.messageService.setMessage(
            'notification.requests.joinWorkspace.title'
        );
        const message = this.messageService.setMessage(
            'notification.requests.joinWorkspace.message',
            {
                properties: {
                    requestorName: data.requestorName,
                },
            }
        );
        const { workspace, requestId, requestorName } = data;

        return await this.create({
            title,
            message,
            type: NotificationType.REQUEST,
            recipient: recipientId,
            sender: senderId,
            metadata: {
                actionUrl: `/workspace/${workspace.id}/requests`,
                actionText: this.messageService.setMessage(
                    'notification.requests.action.view'
                ),
                data: {
                    requestId,
                    workspace: {
                        id: workspace.id,
                        name: workspace.name,
                    },
                    requestorName,
                },
            },
        });
    }
}
