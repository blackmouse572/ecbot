import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Rel,
} from '@mikro-orm/postgresql';
import { Exclude } from 'class-transformer';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { RolePermissionEntity } from 'src/modules/role/repository/entities/role.permission.entity';

export const RoleTableName = 'roles';

@Entity({ tableName: RoleTableName })
@Index({ properties: ['name', 'workspace'] })
@Index({ properties: ['type'] })
@Index({ properties: ['isActive'] })
export class RoleEntity extends DatabaseEntityBase {
    // Holds `Owner - <workspace name>` and workspaces.name is varchar(255).
    @Property({ type: 'varchar', length: 300 })
    name: string;

    @Property({ type: 'varchar', length: 500, nullable: true })
    description?: string;

    @Property({ type: 'boolean', default: true })
    isActive: boolean;

    @Enum(() => ENUM_POLICY_ROLE_TYPE)
    type: ENUM_POLICY_ROLE_TYPE;

    @Embedded(() => RolePermissionEntity, { array: true })
    permissions: RolePermissionEntity[];

    @ManyToOne(() => WorkspaceEntity, { nullable: true, lazy: true })
    workspace?: Rel<WorkspaceEntity>;
}
