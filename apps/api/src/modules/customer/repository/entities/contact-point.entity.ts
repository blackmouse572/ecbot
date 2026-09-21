import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { CustomerEntity } from './customer.entity';

export const ContactPointTableName = 'contact_points';

@Entity({ tableName: ContactPointTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['customer'] })
@Unique({ properties: ['workspace', 'platform', 'externalSenderId'] })
export class ContactPointEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => CustomerEntity)
    customer: CustomerEntity;

    @Enum(() => ENUM_ACCOUNT_TYPE)
    platform: ENUM_ACCOUNT_TYPE;

    @Property({ type: 'varchar', length: 255 })
    externalSenderId: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    displaySenderName?: string;

    @Property({ type: 'text', nullable: true })
    senderAvatar?: string;

    @Property({ type: 'timestamptz', nullable: true })
    fetchedAt?: Date;
}
