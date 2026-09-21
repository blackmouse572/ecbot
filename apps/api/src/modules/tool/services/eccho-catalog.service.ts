import { Injectable } from '@nestjs/common';
import {
    ECCHO_TOOLKITS,
    EcchoToolkitDef,
} from 'src/modules/tool/constants/eccho-toolkits.constant';
import {
    ComposioToolkit,
    ComposioToolkitPage,
} from 'src/modules/tool/interfaces/composio.interface';

@Injectable()
export class EcchoCatalogService {
    getToolkits(params: {
        category?: string;
        search?: string;
        limit: number;
        offset: number;
    }): ComposioToolkitPage {
        let items = ECCHO_TOOLKITS.map(EcchoCatalogService.toComposioToolkit);

        if (params.category) {
            items = items.filter(t =>
                t.categories?.some(c => c.id === params.category)
            );
        }
        if (params.search) {
            const q = params.search.toLowerCase();
            items = items.filter(
                t =>
                    t.name.toLowerCase().includes(q) ||
                    (t.description ?? '').toLowerCase().includes(q)
            );
        }

        const total = items.length;
        return {
            items: items.slice(params.offset, params.offset + params.limit),
            total,
        };
    }

    findBySlug(slug: string): EcchoToolkitDef | undefined {
        return ECCHO_TOOLKITS.find(t => t.slug === slug);
    }

    getCategories(): { id: string; name: string }[] {
        const seen = new Set<string>();
        const result: { id: string; name: string }[] = [];
        for (const t of ECCHO_TOOLKITS) {
            for (const c of t.categories) {
                if (!seen.has(c.id)) {
                    seen.add(c.id);
                    result.push(c);
                }
            }
        }
        return result;
    }

    private static toComposioToolkit(def: EcchoToolkitDef): ComposioToolkit {
        return {
            slug: def.slug,
            name: def.name,
            description: def.description,
            logo: def.logo,
            categories: def.categories,
        };
    }
}
