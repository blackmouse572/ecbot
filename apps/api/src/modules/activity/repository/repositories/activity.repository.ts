import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_ACTIVITY_ACTION } from '../../enums/activity.enum';
import { ActivityEntity } from '../entities/activity.entity';

@Injectable()
export class ActivityRepository extends DatabaseRepository<ActivityEntity> {
    constructor(em: EntityManager) {
        super(em, ActivityEntity);
    }

    async findByUser(
        userId: string,
        limit?: number
    ): Promise<ActivityEntity[]> {
        return this.find(
            { by: userId },
            {
                populate: ['by', 'by.role', 'by.country', 'user', 'workspace'],
                orderBy: { createdAt: 'DESC' },
                limit,
            }
        );
    }

    async findByAction(
        action: ENUM_ACTIVITY_ACTION,
        limit?: number
    ): Promise<ActivityEntity[]> {
        return this.find(
            { action },
            {
                populate: ['by', 'by.role', 'by.country', 'user', 'workspace'],
                orderBy: { createdAt: 'DESC' },
                limit,
            }
        );
    }

    async findByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<ActivityEntity[]> {
        return this.find(
            {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate,
                },
            },
            {
                populate: ['by', 'by.role', 'by.country', 'user', 'workspace'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findRecentActivities(
        days: number = 30,
        limit: number = 100
    ): Promise<ActivityEntity[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.find(
            {
                createdAt: { $gte: cutoffDate },
            },
            {
                populate: ['by', 'by.role', 'by.country', 'user', 'workspace'],
                orderBy: { createdAt: 'DESC' },
                limit,
            }
        );
    }

    async findByWorkspace(
        workspaceId: string,
        limit?: number
    ): Promise<ActivityEntity[]> {
        return this.find(
            { workspace: workspaceId },
            {
                populate: ['by', 'by.role', 'by.country', 'user', 'workspace'],
                orderBy: { createdAt: 'DESC' },
                limit,
            }
        );
    }
}
