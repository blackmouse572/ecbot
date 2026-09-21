import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Rel,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ToolSource } from 'src/modules/tool/interfaces/tool-source.interface';

export const ToolTableName = 'tools';

export enum ENUM_HTTP_METHOD {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

@Entity({ tableName: ToolTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['kind'] })
@Index({ properties: ['status'] })
@Unique({ properties: ['workspace', 'slug'] })
export class ToolEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace!: Rel<WorkspaceEntity>;

    @Enum(() => ENUM_TOOL_KIND)
    kind!: ENUM_TOOL_KIND;

    @Property({ type: 'varchar', length: 80 })
    slug!: string;

    @Property({ type: 'varchar', length: 120 })
    displayName!: string;

    @Property({ type: 'jsonb', nullable: true })
    source?: ToolSource;

    @Property({ type: 'text' })
    description!: string;

    @Enum(() => ENUM_TOOL_STATUS)
    status: ENUM_TOOL_STATUS = ENUM_TOOL_STATUS.ACTIVE;

    // ---- HTTP fields ----
    @Enum({ items: () => ENUM_HTTP_METHOD, nullable: true })
    httpMethod?: ENUM_HTTP_METHOD;

    @Property({ type: 'varchar', length: 2048, nullable: true })
    httpUrl?: string;

    @Property({ type: 'jsonb', nullable: true })
    httpInputSchema?: Record<string, unknown>;

    @Property({ type: 'jsonb', nullable: true })
    httpHeaders?: Record<string, string>;

    @Property({ type: 'jsonb', nullable: true })
    httpAuth?: {
        type: 'bearer' | 'api_key' | 'basic' | 'none';
        placement?: 'header' | 'query';
        paramName?: string;
    };

    @Property({ type: 'text', nullable: true })
    httpCredential?: string; // envelope-encrypted

    @Property({ type: 'int', default: 10000 })
    timeoutMs: number = 10000;

    @Property({ type: 'int', default: 1 })
    maxRetries: number = 1;

    // ---- MCP fields ----
    @Enum({ items: () => ENUM_MCP_PROVIDER, nullable: true })
    mcpProvider?: ENUM_MCP_PROVIDER;

    @Property({ type: 'varchar', length: 2048, nullable: true })
    mcpServerUrl?: string;

    @Property({ type: 'jsonb', nullable: true })
    mcpAuth?: {
        type: 'bearer' | 'api_key' | 'none';
        placement?: 'header';
        paramName?: string;
    };

    @Property({ type: 'text', nullable: true })
    mcpCredential?: string; // envelope-encrypted

    @Property({ type: 'jsonb', nullable: true })
    discoveredActions?: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
    }>;

    @Property({ type: 'timestamptz', nullable: true })
    discoveryAt?: Date;
}
