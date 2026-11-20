import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ContactPointEntity } from '../entities/contact-point.entity';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class ContactPointRepository extends DatabaseRepository<ContactPointEntity> {
    constructor(em: EntityManager) {
        super(em, ContactPointEntity);
    }

    async findByWorkspacePlatformSender(
        workspaceId: string,
        platform: ENUM_ACCOUNT_TYPE,
        externalSenderId: string
    ): Promise<ContactPointEntity | null> {
        return this.findOne({
            workspace: workspaceId,
            platform,
            externalSenderId,
            deletedAt: null,
        } as any);
    }

    async findByCustomer(customerId: string): Promise<ContactPointEntity[]> {
        return this.find({
            customer: customerId,
            deletedAt: null,
        } as any);
    }

    /**
     * A new Customer and its ContactPoint, in one transaction. Null when a
     * concurrent request recorded this sender first: nothing is left behind,
     * and the caller reads the winner's contact point.
     */
    async createWithCustomer(
        workspaceId: string,
        platform: ENUM_ACCOUNT_TYPE,
        externalSenderId: string
    ): Promise<ContactPointEntity | null> {
        try {
            return await this.em.transactional(async em => {
                // SAFETY: a reference by id is all the relation needs.
                const workspace = { id: workspaceId } as never;
                const customer = em.create(CustomerEntity, { workspace });
                const contactPoint = em.create(ContactPointEntity, {
                    workspace,
                    customer,
                    platform,
                    externalSenderId,
                });
                await em.flush();
                return contactPoint;
            });
        } catch (error: unknown) {
            if (error instanceof UniqueConstraintViolationException)
                return null;
            throw error;
        }
    }
}
