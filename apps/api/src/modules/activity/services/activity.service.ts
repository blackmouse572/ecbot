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
import { ActivityCreateRequest } from 'src/modules/activity/dtos/request/activity.create.response.dto';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityEntity } from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

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

    // A read of personal data (conversation, customer). Takes the user id
    // from the JWT so the read path costs one insert and no user lookup.
    async createView(
        userId: string,
        workspace: WorkspaceEntity,
        subject: ENUM_POLICY_SUBJECT,
        metadata: Record<string, any>
    ): Promise<ActivityEntity> {
        const user = this.activityRepository
            .getEntityManager()
            .getReference(UserEntity, userId);
        const create = this.build(user, user, {
            action: ENUM_ACTIVITY_ACTION.VIEW,
            subject,
            metadata,
        });
        create.workspace = workspace;

        return this.activityRepository.create(create);
    }

    // Stamps the caller's IP and user agent from the current request, so no
    // call site passes them; outside a request (seeds, workers) both stay
    // empty. `request.ip` honours the `trust proxy` hops set in main.ts, the
    // same source SessionService records for sessions.
    private build(
        user: UserEntity,
        by: UserEntity,
        { action, subject, metadata }: ActivityCreateRequest
    ): ActivityEntity {
        const request = this.cls.get<IRequestApp | undefined>(CLS_REQ);

        const create: ActivityEntity = new ActivityEntity();
        create.action = action;
        create.subject = subject;
        create.metadata = metadata;
        create.user = user;
        create.by = by;
        create.ipAddress = request?.ip;
        create.userAgent = request?.headers?.['user-agent'];

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
}
