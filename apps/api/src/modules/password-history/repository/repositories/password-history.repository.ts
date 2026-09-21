import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/bases/database.repository';
import { PasswordHistoryEntity } from '../entities/password-history.entity';

@Injectable()
export class PasswordHistoryRepository extends DatabaseRepository<PasswordHistoryEntity> {
    constructor(em: EntityManager) {
        super(em, PasswordHistoryEntity);
    }

    async findByUser(
        userId: string,
        limit?: number
    ): Promise<PasswordHistoryEntity[]> {
        return this.find(
            { by: userId },
            {
                populate: ['by', 'by.role', 'by.country'],
                orderBy: { createdAt: 'DESC' },
                limit,
            }
        );
    }

    async findRecentByUser(
        userId: string,
        days: number = 90
    ): Promise<PasswordHistoryEntity[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.find(
            {
                by: userId,
                createdAt: { $gte: cutoffDate },
            },
            {
                populate: ['by', 'by.role', 'by.country'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }
}
