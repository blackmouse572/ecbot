import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

export const ClientCredentialTableName = 'client_credentials';

// Workspace-owned key that lets a 3rd-party client (website chat / MCP /
// chat adapter) call Ecbot on behalf of a Workspace. Secret is hash-only
// (sha256(key:secret)) — shown once, never recoverable. See ADR-0012.
@Entity({ tableName: ClientCredentialTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['name'] })
@Index({ properties: ['isActive'] })
@Index({ properties: ['deleted'] })
@Unique({ properties: ['key'] })
export class ClientCredentialEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({ type: 'varchar', length: 100 })
    name: string;

    @Property({ type: 'varchar', length: 50 })
    key: string;

    @Property({ type: 'varchar' })
    hash: string;

    @Property({ type: 'boolean' })
    isActive: boolean;

    @Property({ type: 'timestamptz', nullable: true })
    startDate?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    endDate?: Date;
}
