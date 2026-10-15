import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CustomerAdminGetResponseDto } from '../dtos/response/customer.admin-get.response.dto';
import { CustomerAdminListResponseDto } from '../dtos/response/customer.admin-list.response.dto';
import { ContactPointEntity } from '../repository/entities/contact-point.entity';
import { CustomerTagEntity } from '../repository/entities/customer-tag.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { ContactPointRepository } from '../repository/repositories/contact-point.repository';
import { CustomerTagAssignmentRepository } from '../repository/repositories/customer-tag-assignment.repository';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { CustomerService } from './customer.service';

/** Read side of the admin customer pages: every customer, any workspace. */
@Injectable()
export class CustomerAdminService {
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly contactPointRepository: ContactPointRepository,
        private readonly customerTagAssignmentRepository: CustomerTagAssignmentRepository,
        private readonly customerService: CustomerService
    ) {}

    async findAll(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerAdminListResponseDto[]> {
        const customers = await this.customerRepository.find(this.where(find), {
            ...options,
            populate: ['workspace'],
        });
        if (customers.length === 0) return [];

        const ids = customers.map(customer => customer.id);
        const [contactPoints, tags] = await Promise.all([
            this.findContactPoints(ids),
            this.findTags(ids),
        ]);
        return customers.map(customer =>
            plainToInstance(
                CustomerAdminListResponseDto,
                this.toPlain(
                    customer,
                    contactPoints.get(customer.id) ?? [],
                    tags.get(customer.id) ?? []
                ),
                { excludeExtraneousValues: true }
            )
        );
    }

    getTotal(find: Record<string, any>): Promise<number> {
        return this.customerRepository.getTotal(this.where(find));
    }

    async findOneById(id: string): Promise<CustomerAdminGetResponseDto | null> {
        const customer = await this.customerRepository.findOne(
            { id, deletedAt: null },
            { populate: ['workspace'] }
        );
        if (!customer) return null;

        const [contactPoints, tags, summaries] = await Promise.all([
            this.findContactPoints([customer.id]),
            this.findTags([customer.id]),
            this.customerService.summarizeConversations(
                [customer.id],
                customer.workspace.id
            ),
        ]);
        const points = contactPoints.get(customer.id) ?? [];

        return plainToInstance(
            CustomerAdminGetResponseDto,
            {
                ...this.toPlain(customer, points, tags.get(customer.id) ?? []),
                language: customer.language,
                notes: customer.notes,
                profileSummary: customer.profileSummary,
                mergedIntoCustomerId: customer.mergedIntoCustomerId,
                conversationCount:
                    summaries.get(customer.id)?.conversationCount ?? 0,
                contactPoints: points.map(point => ({
                    id: point.id,
                    platform: point.platform,
                    displayName: point.displaySenderName,
                    avatar: point.senderAvatar,
                    createdAt: point.createdAt,
                })),
            },
            { excludeExtraneousValues: true }
        );
    }

    // `tag` and `platform` are not columns of the customer: they match live
    // tag assignments and contact points. A merged-away duplicate is hidden,
    // as on the workspace list.
    private where(find: Record<string, any>): FilterQuery<CustomerEntity> {
        const { tag, platform, ...rest } = find;
        return {
            deletedAt: null,
            mergedIntoCustomerId: null,
            ...rest,
            ...(tag && {
                tagAssignments: { $some: { tag, deletedAt: null } },
            }),
            ...(platform && {
                contactPoints: { $some: { platform, deletedAt: null } },
            }),
        };
    }

    /** Live contact points per customer, oldest first, in one query. */
    private async findContactPoints(
        customerIds: string[]
    ): Promise<Map<string, ContactPointEntity[]>> {
        const points = await this.contactPointRepository.find(
            { customer: { $in: customerIds }, deletedAt: null },
            { orderBy: { createdAt: 'ASC' } }
        );
        return this.groupByCustomer(points, point => point);
    }

    /** Live tags per customer, by name, in one query. */
    private async findTags(
        customerIds: string[]
    ): Promise<Map<string, CustomerTagEntity[]>> {
        const assignments = await this.customerTagAssignmentRepository.find(
            {
                customer: { $in: customerIds },
                deletedAt: null,
                tag: { deletedAt: null },
            },
            { populate: ['tag'] }
        );
        const byCustomer = this.groupByCustomer(
            assignments,
            assignment => assignment.tag
        );
        for (const tags of byCustomer.values()) {
            tags.sort((a, b) => a.name.localeCompare(b.name));
        }
        return byCustomer;
    }

    private groupByCustomer<TRow extends { customer: CustomerEntity }, TValue>(
        rows: TRow[],
        pick: (row: TRow) => TValue
    ): Map<string, TValue[]> {
        const grouped = new Map<string, TValue[]>();
        for (const row of rows) {
            const list = grouped.get(row.customer.id) ?? [];
            list.push(pick(row));
            grouped.set(row.customer.id, list);
        }
        return grouped;
    }

    private toPlain(
        customer: CustomerEntity,
        contactPoints: ContactPointEntity[],
        tags: CustomerTagEntity[]
    ): Record<string, unknown> {
        const channels = [
            ...new Set(contactPoints.map(point => point.platform)),
        ].sort() as ENUM_ACCOUNT_TYPE[];
        return {
            id: customer.id,
            name: customer.name ?? undefined,
            displayName:
                customer.name ??
                contactPoints.find(point => point.displaySenderName)
                    ?.displaySenderName,
            phone: customer.phone ?? undefined,
            email: customer.email ?? undefined,
            avatar:
                contactPoints.find(point => point.senderAvatar)?.senderAvatar ??
                undefined,
            workspace: customer.workspace,
            contactPointCount: contactPoints.length,
            channels,
            tags,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        };
    }
}
