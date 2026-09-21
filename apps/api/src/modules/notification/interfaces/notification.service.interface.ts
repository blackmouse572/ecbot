import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from '../../../common/database/interfaces/database.interface';
import { IPaginationQueryOptions } from '../../../common/pagination/interfaces/pagination.interface';
import { NotificationCreateDto } from '../dtos/notification.create.dto';
import { NotificationListDto } from '../dtos/notification.list.dto';
import { NotificationUpdateDto } from '../dtos/notification.update.dto';
import { NotificationDoc } from '../repository/entities/notification.entity';

export interface INotificationService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<NotificationDoc[]>;

    findAllByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<NotificationDoc[]>;

    findAllByRecipient(
        recipientId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<NotificationDoc[]>;
    findAllWithPagination(
        find: NotificationListDto,
        options: IPaginationQueryOptions
    ): Promise<{
        data: NotificationDoc[];
        totalData: number;
        totalPage: number;
    }>;

    findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<NotificationDoc>;

    create(
        dto: NotificationCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<NotificationDoc>;

    update(
        id: string,
        dto: NotificationUpdateDto,
        options?: IDatabaseCreateOptions
    ): Promise<NotificationDoc>;

    markAsRead(id: string): Promise<NotificationDoc>;

    markAsArchived(id: string): Promise<NotificationDoc>;

    delete(id: string): Promise<NotificationDoc>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;

    getUnreadCount(recipientId: string): Promise<number>;

    getUnreadCountByWorkspace(workspaceId: string): Promise<number>;

    // Bulk operations
    markAllAsReadByRecipient(recipientId: string): Promise<void>;

    deleteExpiredNotifications(): Promise<void>;

    createWorkspaceInvitation(
        recipientId: string,
        senderId: string,
        workspace: Record<string, any>
    ): Promise<NotificationDoc>;

    createWorkspaceActivity(
        recipientIds: string[],
        senderId: string,
        workspace: Record<string, any>,
        activityMessage: string
    ): Promise<NotificationDoc[]>;

    createRequestToJoinWorkspace(
        recipientId: string,
        senderId: string,
        data: {
            requestId: string;
            workspace: { _id: string; name: string };
            requestorName: string;
        }
    ): Promise<NotificationDoc>;
}
