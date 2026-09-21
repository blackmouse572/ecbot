import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ComposioApi } from 'src/common/composio/composio-api.service';
import {
    ComposioToolkit,
    ComposioToolkitDetail,
    ComposioToolkitPage,
} from '../interfaces/composio.interface';

// ComposioApi is registered as a global provider via ComposioModule.forRoot(),
// which is imported in CommonModule. No additional ToolModule import is needed.

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
}
