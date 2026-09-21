import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from './workspace.entity';

export const WorkspaceMemberTableName = 'workspace_members';

@Entity({ tableName: WorkspaceMemberTableName })
@Index({ properties: ['workspace', 'user'] })
@Index({ properties: ['workspace'] })
@Index({ properties: ['user'] })
@Index({ properties: ['role'] })
@Index({ properties: ['isActive'] })
export class WorkspaceMemberEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => UserEntity)
    user: UserEntity;

    @ManyToOne(() => RoleEntity)
    role: RoleEntity;

    @Property({ type: 'timestamptz', defaultRaw: 'now()' })
    joinedAt: Date = new Date();

    @Property({ type: 'boolean', default: true })
    isActive: boolean = true;
}

export type WorkspaceMemberDoc = WorkspaceMemberEntity;
