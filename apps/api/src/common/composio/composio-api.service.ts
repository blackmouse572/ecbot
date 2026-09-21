import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ComposioCatalogResponse,
    ComposioToolkit,
    ComposioToolkitDetail,
} from 'src/modules/tool/interfaces/composio.interface';

// ---------------------------------------------------------------------------
// Composio REST API response shapes
// ---------------------------------------------------------------------------

export interface ComposioAuthConfigItem {
    id: string;
    toolkit?: { slug: string };
    appKey?: string;
    app_key?: string;
}

export interface ComposioAuthConfigListResponse {
    items?: ComposioAuthConfigItem[];
}

export interface ComposioAuthConfigCreateResponse {
    id?: string;
    auth_config?: { id: string };
}

export interface ComposioConnectedAccount {
    auth_config?: { id: string };
    authConfigId?: string;
    user_id?: string;
}

export interface ComposioMcpServerItem {
    id: string;
}

export interface ComposioMcpServerListResponse {
    items?: ComposioMcpServerItem[];
}

export interface ComposioMcpServerCreateResponse {
    id?: string;
}

export interface ComposioMcpGenerateResponse {
    url?: string;
    mcp_url?: string;
    connected_account_urls?: string[];
    user_ids_url?: string[];
    urls?: string[];
}

export interface ComposioConnectedAccountLinkResponse {
    redirect_url?: string;
    redirectUrl?: string;
}

// ---------------------------------------------------------------------------
// ComposioApiError — typed error with a stable code field so callers can
// discriminate without string-matching upstream error messages.
// ---------------------------------------------------------------------------

export class ComposioApiError extends Error {
    constructor(
        public readonly code: string,
        message: string
    ) {
        super(message);
        this.name = 'ComposioApiError';
    }
}

// ---------------------------------------------------------------------------
// ComposioApi — single typed HTTP adapter for all Composio REST calls.
// Registered as a global provider via ComposioModule.forRoot().
// ---------------------------------------------------------------------------

@Injectable()
export class ComposioApi {
    private readonly logger = new Logger(ComposioApi.name);
    private readonly baseUrl: string;
    private readonly apiKey: string | undefined;

    constructor(private readonly cfg: ConfigService) {
        this.baseUrl =
            this.cfg.get<string>('composio.baseUrl') ??
            'https://backend.composio.dev';
        this.apiKey = this.cfg.get<string>('composio.apiKey');
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    private get headers(): Record<string, string> {
        return {
            'x-api-key': this.apiKey ?? '',
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(
        url: string,
        init: RequestInit = {}
    ): Promise<{ ok: boolean; status: number; body: T; text: string }> {
        const res = await fetch(url, {
            ...init,
            headers: {
                ...this.headers,
                ...(init.headers as Record<string, string> | undefined),
            },
        });
        const text = await res.text();
        let body: T;
        try {
            body = JSON.parse(text) as T;
        } catch {
            body = {} as T;
        }
        return { ok: res.ok, status: res.status, body, text };
    }

    // -----------------------------------------------------------------------
    // Catalog
    // -----------------------------------------------------------------------

    // Fetches the first page of toolkits (up to 1000). Composio's catalog is
    // currently well under this limit; add pagination if it ever exceeds it.
    async listToolkits(params: {
        category?: string;
        search?: string;
    }): Promise<{ items: ComposioToolkit[]; total: number }> {
        const url = new URL(`${this.baseUrl}/toolkits`);
        url.searchParams.set('limit', '1000');

        const { ok, status, body } =
            await this.request<ComposioCatalogResponse>(url.toString());

        if (!ok) {
            throw new BadRequestException(
                `Composio catalog fetch failed: ${status}`
            );
        }

        const items = body.items.map(it => ({
            slug: it.slug,
            name: it.name,
            description: it.meta.description,
            categories: it.meta.categories,
            logo: it.meta.logo,
        }));

        return { items, total: items.length };
    }

    async getToolkit(slug: string): Promise<ComposioToolkitDetail | null> {
        const { ok, status, body } = await this.request<ComposioToolkitDetail>(
            `${this.baseUrl}/toolkits/${encodeURIComponent(slug)}`
        );

        if (!ok) {
            if (status === 404) return null;
            throw new BadRequestException(
                `Composio toolkit detail fetch failed: ${status}`
            );
        }

        return body;
    }

    async listCategories(): Promise<{ id: string; name: string }[]> {
        const url = new URL(`${this.baseUrl}/toolkits/categories`);

        const { ok, status, body } = await this.request<unknown>(
            url.toString()
        );

        if (!ok) {
            throw new BadRequestException(
                `Composio categories fetch failed: ${status}`
            );
        }

        const raw: unknown[] = Array.isArray(body)
            ? body
            : (((body as Record<string, unknown>)?.items as unknown[]) ?? []);

        return raw
            .filter(
                (c): c is { id: string; name?: string } =>
                    typeof (c as Record<string, unknown>)?.id === 'string'
            )
            .map(c => ({ id: c.id, name: c.name ?? c.id }));
    }

    // -----------------------------------------------------------------------
    // Auth config
    // -----------------------------------------------------------------------

    /**
     * Returns the existing Composio auth config ID for the toolkit, or null
     * if no auth config has been created yet.
     */
    async findAuthConfig(toolkitSlug: string): Promise<string | null> {
        const listUrl = `${this.baseUrl}/auth_configs?toolkit=${encodeURIComponent(toolkitSlug)}`;
        const list =
            await this.request<ComposioAuthConfigListResponse>(listUrl);

        if (!list.ok) {
            throw new BadRequestException(
                `Composio auth config list failed: ${list.status}`
            );
        }

        return (
            list.body.items?.find(
                item =>
                    item.toolkit?.slug === toolkitSlug ||
                    item.appKey === toolkitSlug ||
                    item.app_key === toolkitSlug
            )?.id ?? null
        );
    }

    /**
     * Creates a Composio-managed auth config for the toolkit.
     *
     * Throws `ComposioApiError({ code: 'NO_AUTH_REQUIRED' })` if the toolkit
     * needs no authentication (Composio error slug Auth_Config_NoAuthApp).
     */
    async createAuthConfig(toolkitSlug: string): Promise<string> {
        const create = await this.request<ComposioAuthConfigCreateResponse>(
            `${this.baseUrl}/auth_configs`,
            {
                method: 'POST',
                body: JSON.stringify({
                    toolkit: { slug: toolkitSlug },
                    auth_config: {
                        type: 'use_composio_managed_auth',
                        name: `${toolkitSlug} Auth Config`,
                    },
                }),
            }
        );

        if (!create.ok) {
            const parsed = create.body as { error?: { slug?: string } };
            if (parsed?.error?.slug === 'Auth_Config_NoAuthApp') {
                this.logger.log(
                    `Toolkit "${toolkitSlug}" requires no auth — skipping OAuth flow`
                );
                throw new ComposioApiError(
                    'NO_AUTH_REQUIRED',
                    `Toolkit "${toolkitSlug}" requires no authentication`
                );
            }
            this.logger.error(
                `Composio auth config create failed. Status: ${create.status}, Body: ${create.text}`
            );
            throw new BadRequestException(
                `Composio auth config create failed: ${create.status}`
            );
        }

        const id = create.body.id ?? create.body.auth_config?.id;
        if (!id) {
            throw new BadRequestException(
                'Composio did not return an auth config ID'
            );
        }
        return id;
    }

    /**
     * Finds or creates a Composio-managed auth config for the toolkit.
     *
     * Returns null if the toolkit requires no authentication
     * (Composio error slug Auth_Config_NoAuthApp).
     */
    async ensureAuthConfig(toolkitSlug: string): Promise<string | null> {
        const existing = await this.findAuthConfig(toolkitSlug);
        if (existing) return existing;

        try {
            return await this.createAuthConfig(toolkitSlug);
        } catch (err) {
            if (
                err instanceof ComposioApiError &&
                err.code === 'NO_AUTH_REQUIRED'
            ) {
                return null;
            }
            throw err;
        }
    }

    // -----------------------------------------------------------------------
    // Connected accounts (OAuth)
    // -----------------------------------------------------------------------

    async linkConnectedAccount(params: {
        authConfigId: string;
        userId: string;
        callbackUrl: string;
    }): Promise<{ redirectUrl: string }> {
        const { ok, status, body } =
            await this.request<ComposioConnectedAccountLinkResponse>(
                `${this.baseUrl}/connected_accounts/link`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        auth_config_id: params.authConfigId,
                        user_id: params.userId,
                        callback_url: params.callbackUrl,
                    }),
                }
            );

        if (!ok) {
            throw new BadRequestException(`Composio link failed: ${status}`);
        }

        const redirectUrl = body.redirect_url ?? body.redirectUrl;
        if (!redirectUrl) {
            throw new BadRequestException(
                'Composio did not return a redirect URL'
            );
        }

        return { redirectUrl };
    }

    async getConnectedAccount(
        id: string
    ): Promise<{ authConfigId: string; userId: string | null }> {
        const { ok, status, body } =
            await this.request<ComposioConnectedAccount>(
                `${this.baseUrl}/connected_accounts/${id}`
            );

        if (!ok) {
            throw new BadRequestException(
                `Composio connected account fetch failed: ${status}`
            );
        }

        const authConfigId = body.auth_config?.id ?? body.authConfigId;
        if (!authConfigId) {
            throw new BadRequestException(
                'Composio connected account missing auth_config_id'
            );
        }

        return { authConfigId, userId: body.user_id ?? null };
    }

    // -----------------------------------------------------------------------
    // MCP server
    // -----------------------------------------------------------------------

    /**
     * Finds or creates an MCP server.
     *
     * - If authConfigId provided: searches by auth_config_id, or creates with
     *   auth_config_ids set.
     * - If no authConfigId (no-auth toolkit): searches by toolkit_slug, or
     *   creates without auth_config_ids.
     */
    async findOrCreateMcpServer(params: {
        authConfigId?: string;
        toolkitSlug: string;
    }): Promise<{ id: string }> {
        const { authConfigId, toolkitSlug } = params;

        // Filter by both toolkit AND auth config so we never return a server
        // that belongs to a different toolkit sharing the same Google OAuth config.
        const listParams = new URLSearchParams({ toolkits: toolkitSlug });
        if (authConfigId) {
            listParams.set('auth_config_ids', authConfigId);
        }

        const list = await this.request<ComposioMcpServerListResponse>(
            `${this.baseUrl}/mcp/servers?${listParams.toString()}`
        );

        if (list.ok) {
            const existingId = list.body.items?.[0]?.id;
            if (existingId) return { id: existingId };
        }

        // Create a new MCP server scoped to this toolkit
        const createBody: Record<string, unknown> = {
            name: `${toolkitSlug} MCP Server`,
            managed_auth_via_composio: true,
        };
        if (authConfigId) {
            createBody.auth_config_ids = [authConfigId];
        } else {
            // No-auth toolkit: declare it via no_auth_apps so the server knows
            // which tools to expose.
            createBody.no_auth_apps = [toolkitSlug];
        }

        const create = await this.request<ComposioMcpServerCreateResponse>(
            `${this.baseUrl}/mcp/servers`,
            {
                method: 'POST',
                body: JSON.stringify(createBody),
            }
        );

        if (!create.ok) {
            this.logger.error(
                `Composio MCP server create failed: ${create.status} ${create.text}`
            );
            throw new BadRequestException(
                `Composio MCP server create failed: ${create.status}`
            );
        }

        const id = create.body.id;
        if (!id) {
            throw new BadRequestException(
                'Composio did not return an MCP server ID'
            );
        }

        return { id };
    }

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    /**
     * Returns the list of actions (tools) available for a toolkit slug.
     * Uses Composio's REST API — no MCP transport needed.
     */
    async listToolkitActions(toolkitSlug: string): Promise<
        {
            name: string;
            description: string;
            inputSchema: Record<string, unknown>;
        }[]
    > {
        const url = new URL(`${this.baseUrl}/tools`);
        url.searchParams.set('toolkit_slug', toolkitSlug);
        url.searchParams.set('toolkit_versions', 'latest');
        url.searchParams.set('limit', '200');

        // Composio v3.1 /tools shape: `slug` is the action identifier (and the
        // MCP tool name used at invocation), `name` is a human display label,
        // and `input_parameters` holds the JSON-schema input definition.
        const { ok, status, body } = await this.request<{
            items?: Array<{
                slug?: string;
                name?: string;
                description?: string;
                input_parameters?: Record<string, unknown>;
            }>;
        }>(url.toString());

        if (!ok) {
            throw new BadRequestException(
                `Composio actions fetch failed: ${status}`
            );
        }

        return (body.items ?? [])
            .filter(
                (
                    a
                ): a is {
                    slug: string;
                    name?: string;
                    description?: string;
                    input_parameters?: Record<string, unknown>;
                } => typeof a.slug === 'string' && a.slug.length > 0
            )
            .map(a => {
                const raw = a.input_parameters ?? {};
                // Anthropic requires root schema type to be "object"; Composio may return null.
                const inputSchema: Record<string, unknown> =
                    !raw.type || raw.type === null
                        ? { ...raw, type: 'object' }
                        : raw;
                return {
                    name: a.slug,
                    description: a.description ?? a.name ?? '',
                    inputSchema,
                };
            });
    }

    /**
     * Generates a stable per-user (or no-auth) MCP URL from a server ID.
     *
     * connectedAccountIds is optional — omit for no-auth toolkits.
     */
    async generateMcpUrl(params: {
        serverId: string;
        connectedAccountIds?: string[];
        userIds?: string[];
    }): Promise<string> {
        const reqBody: Record<string, unknown> = {
            mcp_server_id: params.serverId,
            managed_auth_by_composio: true,
        };
        if (params.connectedAccountIds?.length) {
            reqBody.connected_account_ids = params.connectedAccountIds;
        }
        if (params.userIds?.length) {
            reqBody.user_ids = params.userIds;
        }

        const { ok, status, body, text } =
            await this.request<ComposioMcpGenerateResponse>(
                `${this.baseUrl}/mcp/servers/generate`,
                {
                    method: 'POST',
                    body: JSON.stringify(reqBody),
                }
            );

        this.logger.debug(`Composio /mcp/servers/generate response: ${text}`);

        if (!ok) {
            throw new BadRequestException(
                `Composio MCP URL generation failed: ${status}`
            );
        }

        // Prefer user_ids_url (carries ?user_id=...) so Composio's managed-auth
        // validation can match the user_id against the connected account. Fall
        // back to connected_account_urls and then the bare mcp_url.
        const mcpUrl =
            body.user_ids_url?.[0] ??
            body.connected_account_urls?.[0] ??
            body.url ??
            body.mcp_url ??
            (Array.isArray(body.urls) ? body.urls[0] : undefined);

        if (!mcpUrl) {
            this.logger.error(
                `Composio /mcp/servers/generate returned no URL. Full body: ${text}`
            );
            throw new BadRequestException(
                'Composio did not return an MCP endpoint URL'
            );
        }

        return mcpUrl;
    }
}
