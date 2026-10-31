import { Injectable } from '@nestjs/common';
import {
    ECCHO_TOOLKITS,
    EcchoToolkitDef,
} from 'src/modules/tool/constants/eccho-toolkits.constant';
import {
    ComposioToolkit,
    ComposioToolkitPage,
} from 'src/modules/tool/interfaces/composio.interface';
import { ToolkitOverrideEntity } from 'src/modules/tool/repository/entities/toolkit-override.entity';
import { ToolkitOverrideRepository } from 'src/modules/tool/repository/repositories/toolkit-override.repository';

@Injectable()
export class EcchoCatalogService {
    constructor(private readonly overrides: ToolkitOverrideRepository) {}

    /** What workspaces see: admin edits applied, disabled toolkits left out. */
    async getToolkits(params: {
        category?: string;
        search?: string;
        limit: number;
        offset: number;
    }): Promise<ComposioToolkitPage> {
        let items = (await this.listMerged())
            .filter(t => !t.disabled)
            .map(EcchoCatalogService.toComposioToolkit);

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

    /** The code definition, ignoring admin edits (server URL, paths). */
    findBySlug(slug: string): EcchoToolkitDef | undefined {
        return ECCHO_TOOLKITS.find(t => t.slug === slug);
    }

    /** Merged definition for admins, disabled or not. */
    async findMergedBySlug(
        slug: string
    ): Promise<(EcchoToolkitDef & { disabled: boolean }) | undefined> {
        const def = this.findBySlug(slug);
        if (!def) return undefined;
        const override = await this.overrides.findBySlug(slug);
        return EcchoCatalogService.merge(def, override);
    }

    async listMerged(): Promise<
        Array<EcchoToolkitDef & { disabled: boolean }>
    > {
        const overrides = await this.overrides.findAllBySlug();
        return ECCHO_TOOLKITS.map(def =>
            EcchoCatalogService.merge(def, overrides.get(def.slug))
        );
    }

    async getCategories(): Promise<{ id: string; name: string }[]> {
        const seen = new Set<string>();
        const result: { id: string; name: string }[] = [];
        for (const t of (await this.listMerged()).filter(t => !t.disabled)) {
            for (const c of t.categories) {
                if (!seen.has(c.id)) {
                    seen.add(c.id);
                    result.push(c);
                }
            }
        }
        return result;
    }

    private static merge(
        def: EcchoToolkitDef,
        override?: ToolkitOverrideEntity | null
    ): EcchoToolkitDef & { disabled: boolean } {
        return {
            ...def,
            name: override?.name || def.name,
            description: override?.description || def.description,
            logo: override?.logo || def.logo,
            categories: override?.categories ?? def.categories,
            disabled: override?.disabled ?? false,
        };
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
