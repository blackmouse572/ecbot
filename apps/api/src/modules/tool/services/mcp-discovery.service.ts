import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { HelperEgressService } from 'src/common/helper/services/helper.egress.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { isDestructiveAction } from 'src/modules/tool/utils/destructive-action.util';
import { MCP_DISCOVERY_TIMEOUT_MS } from 'src/modules/tool/constants/tool.constant';

export interface McpAction {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    destructive?: boolean;
}

@Injectable()
export class McpDiscoveryService {
    private readonly logger = new Logger(McpDiscoveryService.name);

    constructor(
        private readonly enc: HelperEncryptionService,
        private readonly cfg: ConfigService,
        private readonly egress: HelperEgressService
    ) {}

    /**
     * Lists the server's actions within MCP_DISCOVERY_TIMEOUT_MS. The SDK's
     * SSE transport waits for its endpoint event with no timeout, so a slow
     * or hostile server could otherwise hold the request open (#247 review);
     * the abort also cancels the server's open streams.
     */
    async discover(tool: ToolEntity): Promise<McpAction[]> {
        const controller = new AbortController();
        let timer: NodeJS.Timeout | undefined;
        const timedOut = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new Error('MCP discovery timed out'));
            }, MCP_DISCOVERY_TIMEOUT_MS);
        });
        try {
            return await Promise.race([
                this.listActions(tool, controller.signal),
                timedOut,
            ]);
        } finally {
            clearTimeout(timer);
        }
    }

    private async listActions(
        tool: ToolEntity,
        signal: AbortSignal
    ): Promise<McpAction[]> {
        const client = await this.connect(tool, signal);
        try {
            const result = await client.listTools();
            return (result.tools ?? []).map((t: any) => ({
                name: t.name,
                description: t.description ?? '',
                inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
                // The annotations are not kept, so decide while they are here.
                destructive: isDestructiveAction({
                    name: t.name,
                    description: t.description,
                    annotations: t.annotations,
                }),
            }));
        } finally {
            try {
                await client.close();
            } catch {
                /* ignore */
            }
        }
    }

    /** Egress fetch that also stops when `signal` aborts. */
    private fetchWith(signal?: AbortSignal): typeof fetch {
        return ((input: string | URL | Request, init?: RequestInit) =>
            this.egress.fetch(input as string | URL, {
                ...init,
                signal:
                    signal && init?.signal
                        ? AbortSignal.any([signal, init.signal])
                        : (signal ?? init?.signal),
            })) as typeof fetch;
    }

    async connect(tool: ToolEntity, signal?: AbortSignal): Promise<Client> {
        if (!tool.mcpServerUrl) {
            throw new Error('MCP tool missing mcpServerUrl');
        }

        const url = new URL(tool.mcpServerUrl);
        const headers: Record<string, string> = {};

        if (tool.mcpProvider === ENUM_MCP_PROVIDER.COMPOSIO) {
            const apiKey = this.cfg.get<string>('composio.apiKey');
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            // New installs store a URL that already has ?user_id=... embedded.
            // Old installs have a bare URL — fall back to connected_account_id.
            if (
                !url.searchParams.has('user_id') &&
                !url.searchParams.has('connected_account_id')
            ) {
                const src = tool.source as
                    | { kind: string; connectedAccountId?: string | null }
                    | undefined;
                if (src?.connectedAccountId) {
                    url.searchParams.set(
                        'connected_account_id',
                        src.connectedAccountId
                    );
                }
            }
        } else if (
            tool.mcpAuth &&
            tool.mcpAuth.type !== 'none' &&
            tool.mcpCredential
        ) {
            const plain = this.enc.envelopeDecrypt(tool.mcpCredential);
            if (tool.mcpAuth.type === 'bearer') {
                headers['Authorization'] = `Bearer ${plain}`;
            } else if (tool.mcpAuth.type === 'api_key') {
                headers[tool.mcpAuth.paramName ?? 'X-API-Key'] = plain;
            }
        }

        // The MCP SDK (plus zod) is only needed when a workspace actually talks
        // to an MCP server — keep it off the boot path.
        const [{ Client }, { StreamableHTTPClientTransport }] =
            await Promise.all([
                import('@modelcontextprotocol/sdk/client/index.js'),
                import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
            ]);

        // Try StreamableHTTP first (modern servers), fall back to SSE (Composio
        // and other legacy endpoints that only support the older transport).
        try {
            const transport = new StreamableHTTPClientTransport(url, {
                requestInit: { headers },
                fetch: this.fetchWith(signal),
            });
            const client = new Client(
                { name: 'eccho', version: '1.0.0' },
                { capabilities: {} }
            );
            await client.connect(transport);
            return client;
        } catch (streamErr) {
            this.logger.debug(
                `StreamableHTTP failed for ${tool.mcpServerUrl}, falling back to SSE: ${String(streamErr)}`
            );
        }

        const { SSEClientTransport } =
            await import('@modelcontextprotocol/sdk/client/sse.js');
        const sseTransport = new SSEClientTransport(url, {
            requestInit: { headers },
            fetch: this.fetchWith(signal),
        });
        const client = new Client(
            { name: 'eccho', version: '1.0.0' },
            { capabilities: {} }
        );
        await client.connect(sseTransport);
        return client;
    }
}
