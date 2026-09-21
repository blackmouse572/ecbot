import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CustomerTagAssignmentGetResponseDto } from '../dtos/response/customer-tag-assignment.get.response.dto';
import { CustomerTagAssignmentEntity } from '../repository/entities/customer-tag-assignment.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { CustomerTagEntity } from '../repository/entities/customer-tag.entity';
import { CustomerTagAssignmentRepository } from '../repository/repositories/customer-tag-assignment.repository';
import { CustomerTagRepository } from '../repository/repositories/customer-tag.repository';
import { CustomerRepository } from '../repository/repositories/customer.repository';

@Injectable()
export class CustomerTagAssignmentService {
    private readonly logger = new Logger(CustomerTagAssignmentService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly customerRepository: CustomerRepository,
        private readonly customerTagRepository: CustomerTagRepository,
        private readonly customerTagAssignmentRepository: CustomerTagAssignmentRepository
    ) {}

    async listByCustomer(
        customerId: string,
        workspaceId?: string
    ): Promise<CustomerTagAssignmentEntity[]> {
        // BOLA guard — refuse to list assignments for a customer that lives
        // in a different workspace.
        if (workspaceId) {
            const customer = await this.customerRepository.findOne({
                id: customerId,
                workspace: workspaceId,
            } as any);
            if (!customer) return [];
        }
        return this.customerTagAssignmentRepository.findByCustomer(customerId);
    }

    async apply(
        customerId: string,
        tagId: string,
        workspaceId?: string
    ): Promise<CustomerTagAssignmentEntity> {
        // BOLA guard — both customer AND tag must live in the caller's
        // workspace when a workspaceId is provided. Collapse cross-workspace
        // to 404 like the rest of the module.
        const customer = workspaceId
            ? await this.customerRepository.findOne({
                  id: customerId,
                  workspace: workspaceId,
              } as any)
            : await this.customerRepository.findOneById(customerId);
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        const tag = workspaceId
            ? await this.customerTagRepository.findOne({
                  id: tagId,
                  workspace: workspaceId,
              } as any)
            : await this.customerTagRepository.findOneById(tagId);
        if (!tag) {
            throw new NotFoundException({
                message: 'customerTag.error.notFound',
                statusCode: 404,
            });
        }

        const existing =
            await this.customerTagAssignmentRepository.findOneByCustomerAndTag(
                customerId,
                tagId
            );
        if (existing) {
            return existing;
        }

        // A removed assignment stays as a soft-deleted row, still covered by
        // the unique (customer, tag) constraint while invisible to the
        // live-only lookup above — restore it instead of inserting a
        // duplicate row (was: 500 unique violation on re-apply after remove).
        const removed = await this.customerTagAssignmentRepository.findOne({
            customer: customerId,
            tag: tagId,
        } as any);
        if (removed) {
            removed.deleted = false;
            removed.deletedAt = null;
            await this.em.flush();
            const restored =
                await this.customerTagAssignmentRepository.findOneByCustomerAndTag(
                    customerId,
                    tagId
                );
            return restored ?? removed;
        }

        const assignment = new CustomerTagAssignmentEntity();
        assignment.customer = this.em.getReference(CustomerEntity, customerId);
        assignment.tag = this.em.getReference(CustomerTagEntity, tagId);

        try {
            await this.em.persistAndFlush(assignment);
        } catch (error) {
            // Concurrent double-submit: both requests passed the existence
            // check, one insert won — return the winner instead of 500ing.
            if (this.isUniqueConstraintViolation(error)) {
                const winner =
                    await this.customerTagAssignmentRepository.findOneByCustomerAndTag(
                        customerId,
                        tagId
                    );
                if (winner) return winner;
            }
            throw error;
        }

        // Reload with populated tag for the response.
        const reloaded =
            await this.customerTagAssignmentRepository.findOneByCustomerAndTag(
                customerId,
                tagId
            );
        return reloaded ?? assignment;
    }

    async remove(
        customerId: string,
        tagId: string,
        workspaceId?: string
    ): Promise<CustomerTagEntity | null> {
        // BOLA guard — ignore the request silently if the customer is not in
        // the caller's workspace.
        if (workspaceId) {
            const customer = await this.customerRepository.findOne({
                id: customerId,
                workspace: workspaceId,
            } as any);
            if (!customer) return null;
        }

        const existing =
            await this.customerTagAssignmentRepository.findOneByCustomerAndTag(
                customerId,
                tagId
            );
        if (!existing) return null;

        await this.customerTagAssignmentRepository.softDelete({
            id: existing.id,
        } as any);

        // Fetched for the caller to log a real tag name on the activity -
        // `existing.tag` above is an unpopulated reference (id only).
        return this.customerTagRepository.findOneById(tagId);
    }

    /**
     * MikroORM v6 surfaces unique-constraint violations as
     * `UniqueConstraintViolationException`. The underlying Postgres error
     * (`23505`) is also kept on the `code` field, so we accept either signal.
     */
    private isUniqueConstraintViolation(error: unknown): boolean {
        if (error instanceof UniqueConstraintViolationException) {
            return true;
        }
        const code = (error as { code?: string } | null)?.code;
        return code === '23505';
    }

    mapGet(
        assignment: CustomerTagAssignmentEntity
    ): CustomerTagAssignmentGetResponseDto {
        return plainToInstance(
            CustomerTagAssignmentGetResponseDto,
            assignment,
            {
                excludeExtraneousValues: true,
            }
        );
    }

    mapList(
        assignments: CustomerTagAssignmentEntity[]
    ): CustomerTagAssignmentGetResponseDto[] {
        return assignments.map(a => this.mapGet(a));
    }
}
