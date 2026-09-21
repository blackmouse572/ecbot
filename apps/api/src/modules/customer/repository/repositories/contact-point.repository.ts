import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ContactPointEntity } from '../entities/contact-point.entity';

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
}
