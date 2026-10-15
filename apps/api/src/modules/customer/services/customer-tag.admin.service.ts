import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CustomerTagAdminListResponseDto } from '../dtos/response/customer-tag.admin-list.response.dto';
import { CustomerTagEntity } from '../repository/entities/customer-tag.entity';
import { CustomerTagAssignmentRepository } from '../repository/repositories/customer-tag-assignment.repository';
import { CustomerTagRepository } from '../repository/repositories/customer-tag.repository';

/** Read side of the admin customer tag page: every tag, any workspace. */
@Injectable()
export class CustomerTagAdminService {
    constructor(
        private readonly customerTagRepository: CustomerTagRepository,
        private readonly customerTagAssignmentRepository: CustomerTagAssignmentRepository
    ) {}

    async findAll(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerTagAdminListResponseDto[]> {
        const tags = await this.customerTagRepository.find(this.where(find), {
            ...options,
            populate: ['workspace'],
        });
        const counts =
            await this.customerTagAssignmentRepository.countCustomersByTags(
                tags.map(tag => tag.id)
            );
        return tags.map(tag =>
            plainToInstance(
                CustomerTagAdminListResponseDto,
                {
                    id: tag.id,
                    name: tag.name,
                    emoji: tag.emoji,
                    description: tag.description,
                    triggersHandoff: tag.triggersHandoff,
                    notifiesTeam: tag.notifiesTeam,
                    customerCount: counts.get(tag.id) ?? 0,
                    workspace: tag.workspace,
                    createdAt: tag.createdAt,
                    updatedAt: tag.updatedAt,
                },
                { excludeExtraneousValues: true }
            )
        );
    }

    getTotal(find: Record<string, any>): Promise<number> {
        return this.customerTagRepository.getTotal(this.where(find));
    }

    private where(find: Record<string, any>): FilterQuery<CustomerTagEntity> {
        return { deletedAt: null, ...find };
    }
}
