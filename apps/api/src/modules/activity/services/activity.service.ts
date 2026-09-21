import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
} from '@app/common/database/interfaces/database.interface';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isObject } from 'lodash';
import { ActivityCreateRequest } from 'src/modules/activity/dtos/request/activity.create.response.dto';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { ActivityEntity } from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class ActivityService {
    constructor(private readonly activityRepository: ActivityRepository) {}

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
        const create: ActivityEntity = new ActivityEntity();
        create.action = action;
        create.subject = subject;
        create.metadata = metadata;
        create.user = user;
        create.by = user;

        return this.activityRepository.create(create, options);
    }

    async createByUserWithWorkspace(
        user: UserEntity,
        workspace: WorkspaceEntity,
        { action, subject, metadata }: ActivityCreateRequest
    ): Promise<ActivityEntity> {
        const create: ActivityEntity = new ActivityEntity();
        create.action = action;
        create.subject = subject;
        create.metadata = metadata;
        create.user = user;
        create.by = user;
        create.workspace = workspace;

        return this.activityRepository.create(create);
    }

    async createByAdmin(
        user: UserEntity,
        byUserId: string,
        { action, subject, metadata }: ActivityCreateRequest
    ): Promise<ActivityEntity> {
        const create: ActivityEntity = new ActivityEntity();
        create.action = action;
        create.subject = subject;
        create.metadata = metadata;
        create.user = user;
        create.by = this.activityRepository
            .getEntityManager()
            .getReference(UserEntity, byUserId);

        return this.activityRepository.create(create);
    }

    async deleteMany(find?: Record<string, any>): Promise<boolean> {
        await this.activityRepository.deleteMany(find);
        return true;
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
