import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Rel,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ToolSource } from 'src/modules/tool/interfaces/tool-source.interface';

export const ToolInstallSessionTableName = 'tool_install_sessions';

@Entity({ tableName: ToolInstallSessionTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['expiresAt'] })
export class ToolInstallSessionEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace!: Rel<WorkspaceEntity>;

    @Enum(() => ENUM_MCP_PROVIDER)
    provider!: ENUM_MCP_PROVIDER;

    @Property({ type: 'varchar', length: 120 })
    draftDisplayName!: string;

    @Property({ type: 'jsonb' })
    draftSource!: Partial<ToolSource>;

    @Property({ type: 'jsonb', nullable: true })
    draftConfig?: Record<string, unknown>;

    @Property({ type: 'timestamptz' })
    expiresAt!: Date;
}
