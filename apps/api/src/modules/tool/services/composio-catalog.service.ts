import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
    BadGatewayException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ComposioApi } from 'src/common/composio/composio-api.service';
import {
    ComposioToolkit,
    ComposioToolkitAuthInfo,
    ComposioToolkitDetail,
    ComposioToolkitPage,
} from '../interfaces/composio.interface';
import { isDestructiveAction } from '../utils/destructive-action.util';

/** What a toolkit can do and the account access it asks for (#189). */
export interface IComposioToolkitAccess {
    actions: {
        name: string;
        /** Composio's readable name ("Batch get spreadsheet"), when it has one. */
        label?: string;
        description: string;
        destructive: boolean;
    }[];
    /** OAuth scopes the sign-in asks for; empty when it has none. */
    scopes: string[];
    /** Install leaves the page for a sign-in (OAuth, or Composio's form for a key). */
    requiresSignIn: boolean;
    /** Ecbot's own tools list their actions after install, not here. */
    provider: 'composio' | 'eccho';
}

@Injectable()
export class ComposioCatalogService {
    private readonly logger = new Logger(ComposioCatalogService.name);
    private static readonly CACHE_KEY = 'composio:catalog:v1';
    private static readonly CATEGORIES_CACHE_KEY = 'composio:categories:v1';
    private static readonly TTL_MS = 3_600_000;

    constructor(
        private readonly api: ComposioApi,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}

    async getToolkits(params: {
        category?: string;
        search?: string;
        limit: number;
        offset: number;
    }): Promise<ComposioToolkitPage> {
        let allItems = await this.cacheManager.get<ComposioToolkit[]>(
            ComposioCatalogService.CACHE_KEY
        );

        if (!allItems) {
            try {
                const result = await this.api.listToolkits({});
                allItems = result.items;
                await this.cacheManager.set(
                    ComposioCatalogService.CACHE_KEY,
                    allItems,
                    ComposioCatalogService.TTL_MS
                );
            } catch (err) {
                this.logger.error(`Composio catalog error: ${String(err)}`);
                return { items: [], total: 0 };
            }
        }

        let filtered = allItems;
        if (params.category) {
            filtered = filtered.filter(t =>
                t.categories?.some(c => c.id === params.category)
            );
        }
        if (params.search) {
            const q = params.search.toLowerCase();
            filtered = filtered.filter(
                t =>
                    t.name.toLowerCase().includes(q) ||
                    (t.description ?? '').toLowerCase().includes(q)
            );
        }

        const total = filtered.length;
        const items = filtered.slice(
            params.offset,
            params.offset + params.limit
        );
        return { items, total };
    }

    async getToolkitBySlug(
        slug: string
    ): Promise<ComposioToolkitDetail | null> {
        const cacheKey = `composio:toolkit:${slug}`;
        let detail =
            await this.cacheManager.get<ComposioToolkitDetail>(cacheKey);
        if (detail) return detail;

        try {
            detail = await this.api.getToolkit(slug);
            if (detail) {
                await this.cacheManager.set(
                    cacheKey,
                    detail,
                    ComposioCatalogService.TTL_MS
                );
            }
            return detail;
        } catch (err) {
            this.logger.error(`Composio toolkit detail error: ${String(err)}`);
            return null;
        }
    }

    async getCategories(): Promise<{ id: string; name: string }[]> {
        let categories = await this.cacheManager.get<
            { id: string; name: string }[]
        >(ComposioCatalogService.CATEGORIES_CACHE_KEY);

        if (!categories) {
            try {
                categories = await this.api.listCategories();
                await this.cacheManager.set(
                    ComposioCatalogService.CATEGORIES_CACHE_KEY,
                    categories,
                    ComposioCatalogService.TTL_MS
                );
            } catch (err) {
                this.logger.error(`Composio categories error: ${String(err)}`);
                return [];
            }
        }

        return categories;
    }

    /**
     * Shown before install, so the owner knows what they hand over. Throws
     * rather than answering "nothing": an empty list on a Composio outage
     * would read as "this toolkit asks for no access".
     */
    async getToolkitAccess(slug: string): Promise<IComposioToolkitAccess> {
        const cacheKey = `composio:toolkit-access:v2:${slug}`;
        const cached =
            await this.cacheManager.get<IComposioToolkitAccess>(cacheKey);
        if (cached) return cached;

        let detail: ComposioToolkitDetail | null;
        let actions: Awaited<ReturnType<ComposioApi['listToolkitActions']>>;
        try {
            [detail, actions] = await Promise.all([
                this.api.getToolkit(slug),
                this.api.listToolkitActions(slug),
            ]);
        } catch (err) {
            this.logger.error(`Composio toolkit access error: ${String(err)}`);
            throw new BadGatewayException(
                'tool.marketplace.toolkit.error.unavailable'
            );
        }
        if (!detail) {
            throw new NotFoundException(
                'tool.marketplace.toolkit.error.notFound'
            );
        }

        // ComposioApi returns the raw REST body, snake_case.
        const auth = detail as unknown as ComposioToolkitAuthInfo;
        const access: IComposioToolkitAccess = {
            provider: 'composio',
            actions: actions.map(a => ({
                name: a.name,
                ...(a.label ? { label: a.label } : {}),
                description: a.description,
                destructive: isDestructiveAction(a),
            })),
            scopes: requestedScopes(auth),
            requiresSignIn:
                (auth.composio_managed_auth_schemes?.length ?? 0) > 0 ||
                (auth.auth_config_details?.length ?? 0) > 0,
        };
        await this.cacheManager.set(
            cacheKey,
            access,
            ComposioCatalogService.TTL_MS
        );
        return access;
    }
}

/**
 * The scopes the install's sign-in requests. The installer creates a
 * Composio-managed auth config, so read the managed scheme's auth details
 * (any of them when Composio names none): the scopes it always requests plus
 * the defaults of its `scopes` / `user_scopes` fields (Slack-style apps ask
 * for both).
 */
function requestedScopes(auth: ComposioToolkitAuthInfo): string[] {
    const managed = new Set(auth.composio_managed_auth_schemes ?? []);
    const configs = (auth.auth_config_details ?? []).filter(
        c => managed.size === 0 || managed.has(c.mode)
    );
    const scopes = new Set<string>();
    for (const config of configs) {
        for (const scope of config.required_scopes ?? []) scopes.add(scope);
        const creation = config.fields?.auth_config_creation;
        for (const field of [
            ...(creation?.required ?? []),
            ...(creation?.optional ?? []),
        ]) {
            if (field.name !== 'scopes' && field.name !== 'user_scopes') {
                continue;
            }
            for (const scope of (field.default ?? '').split(/[\s,]+/)) {
                if (scope) scopes.add(scope);
            }
        }
    }
    return [...scopes];
}
