import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
} from '@app/common/database/interfaces/database.interface';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isObject } from 'lodash';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ACTIVITY_USER_AGENT_MAX_LENGTH } from 'src/modules/activity/constants/activity.constant';
import { ActivityCreateRequest } from 'src/modules/activity/dtos/request/activity.create.response.dto';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { ActivityEntity } from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

import { ActivityAdminListResponseDto } from '../dtos/response/activity.admin-list.response.dto';
import { ActivityAdminWorkspaceResponseDto } from '../dtos/response/activity.admin-workspace.response.dto';
@Injectable()
export class ActivityService {
    constructor(
        private readonly activityRepository: ActivityRepository,
        private readonly cls: ClsService
    ) {}

    async findAll(
        find?: FilterQuery<NoInfer<ActivityEntity>>,
        options?: IDatabaseFindAllOptions
    ): Promise<ActivityEntity[]> {
        return this.activityRepository.find(find || {}, {
            populate: ['by', 'by.role', 'by.country', 'user'],
            ...options,
        });
    }

    async findAllByUser(
        userId: string,
        find?: FilterQuery<NoInfer<ActivityEntity>>,
        options?: IDatabaseFindAllOptions
    ): Promise<ActivityEntity[]> {
        return this.activityRepository.find(
            {
                user: userId,
                ...(isObject(find) ? find : {}),
            },
            {
                populate: ['by', 'by.role', 'by.country', 'user'],
                ...options,
            }
        );
    }

    async findOneById(id: string): Promise<ActivityEntity> {
        return this.activityRepository.findOne({ id });
    }

    async findOne(find: Record<string, any>): Promise<ActivityEntity> {
        return this.activityRepository.findOne(find);
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.activityRepository.getTotal(find || {});
    }

    async getTotalByUser(
        userId: string,
        find?: Record<string, any>
    ): Promise<number> {
        return this.activityRepository.getTotal({ ...find, user: userId });
    }

    async createByUser(
        user: UserEntity,
        { action, subject, metadata }: ActivityCreateRequest,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityEntity> {
        const create = this.build(user, user, { action, subject, metadata });

        return this.activityRepository.create(create, options);
    }

    async createByUserWithWorkspace(
        user: UserEntity,
        workspace: WorkspaceEntity,
        { action, subject, metadata }: ActivityCreateRequest,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityEntity> {
        const create = this.build(user, user, { action, subject, metadata });
        create.workspace = workspace;

        return this.activityRepository.create(create, options);
    }

    async createByAdmin(
        user: UserEntity,
        byUserId: string,
        { action, subject, metadata }: ActivityCreateRequest,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityEntity> {
        const by = this.activityRepository
            .getEntityManager()
            .getReference(UserEntity, byUserId);
        const create = this.build(user, by, { action, subject, metadata });

        return this.activityRepository.create(create, options);
    }

    // A staff actor (partner, platform operator) changes something on the
    // user's behalf inside one workspace.
    async createByAdminWithWorkspace(
        user: UserEntity,
        byUserId: string,
        workspace: WorkspaceEntity,
        { action, subject, metadata }: ActivityCreateRequest,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityEntity> {
        const by = this.activityRepository
            .getEntityManager()
            .getReference(UserEntity, byUserId);
        const create = this.build(user, by, { action, subject, metadata });
        create.workspace = workspace;

        return this.activityRepository.create(create, options);
    }

    // Stamps the caller's IP and user agent from the current request, so no
    // call site passes them; outside a request (seeds, workers) both stay
    // empty. `request.ip` honours the `trust proxy` hops set in main.ts, the
    // same source SessionService records for sessions. During impersonation
    // the acting admin is recorded as `by` (and in metadata), not the user.
    private build(
        user: UserEntity,
        by: UserEntity,
        { action, subject, metadata }: ActivityCreateRequest
    ): ActivityEntity {
        const request = this.cls.get<IRequestApp | undefined>(CLS_REQ);
        const impersonatedBy = request?.user?.impersonatedBy;

        const create: ActivityEntity = new ActivityEntity();
        create.action = action;
        create.subject = subject;
        create.metadata = impersonatedBy
            ? { ...metadata, impersonatedBy }
            : metadata;
        create.user = user;
        create.by = impersonatedBy
            ? this.activityRepository
                  .getEntityManager()
                  .getReference(UserEntity, impersonatedBy)
            : by;
        create.ipAddress = request?.ip;
        create.userAgent = request?.headers?.['user-agent']?.slice(
            0,
            ACTIVITY_USER_AGENT_MAX_LENGTH
        );

        return create;
    }

    mapList(userHistories: ActivityEntity[]): ActivityListResponseDto[] {
        // plainToInstance copies populated relations verbatim (see
        // password-history.service.ts for the same fix) - collapse `user`
        // (populated full UserEntity) back to the id string the DTO declares.
        return userHistories.map(activity => {
            const dto = plainToInstance(ActivityListResponseDto, activity);
            dto.user = (activity.user?.id ?? undefined) as unknown as string;
            // Not declared on ActivityListResponseDto, but plainToInstance still
            // copies it through as an extraneous property when present - strip it
            // regardless of whether `workspace` was populated on the query.
            delete (dto as unknown as Record<string, unknown>).workspace;
            return dto;
        });
    }

    mapAdminList(activities: ActivityEntity[]): ActivityAdminListResponseDto[] {
        const narrow = <T>(cls: new () => T, value?: object): T | undefined =>
            value
                ? plainToInstance(cls, value, { excludeExtraneousValues: true })
                : undefined;
        return activities.map(activity => ({
            id: activity.id,
            createdAt: activity.createdAt,
            updatedAt: activity.updatedAt,
            action: activity.action,
            subject: activity.subject,
            metadata: activity.metadata,
            ipAddress: activity.ipAddress,
            userAgent: activity.userAgent,
            user: narrow(UserMetaResponseDto, activity.user),
            by: narrow(UserMetaResponseDto, activity.by),
            workspace: narrow(
                ActivityAdminWorkspaceResponseDto,
                activity.workspace
            ),
        })) as ActivityAdminListResponseDto[];
    }
}
