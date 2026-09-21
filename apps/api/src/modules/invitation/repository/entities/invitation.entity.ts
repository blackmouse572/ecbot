import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_INVITATION_STATUS } from '../../enums/invitation.enum';

export const InvitationDatabaseName = 'Invitations';

@Entity({ tableName: 'invitations' })
@Index({ properties: ['workspace', 'inviteeEmail'] })
@Index({ properties: ['token'] })
@Index({ properties: ['expiresAt'] })
export class InvitationEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => UserEntity)
    inviter: UserEntity;

    @Property({ type: 'varchar', length: 255 })
    @Index()
    inviteeEmail: string;

    @ManyToOne(() => RoleEntity, { nullable: true })
    role?: RoleEntity;

    @Enum(() => ENUM_INVITATION_STATUS)
    status: ENUM_INVITATION_STATUS = ENUM_INVITATION_STATUS.PENDING;

    // A signed invitation JWT (header.payload.signature) carrying the invite
    // payload — inherently longer than 255 chars once a roleId is included, so
    // this is `text`, not a bounded varchar (the earlier varchar(255) overflowed
    // on insert). Still unique: it is the lookup key in findOneByToken.
    @Property({ type: 'text', unique: true })
    token: string;

    @Property({ type: 'timestamptz' })
    expiresAt: Date;

    @Property({ type: 'timestamptz', nullable: true })
    acceptedAt?: Date;

    @ManyToOne(() => UserEntity, { nullable: true })
    acceptedByUser?: UserEntity;

    @Property({ type: 'timestamptz', nullable: true })
    revokedAt?: Date;

    @ManyToOne(() => UserEntity, { nullable: true })
    revokedByUser?: UserEntity;

    @Property({ type: 'varchar', length: 500, nullable: true })
    invitationLink?: string;
}
