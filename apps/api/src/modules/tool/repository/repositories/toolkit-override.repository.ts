import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DatabaseRepository } from 'src/common/database/bases/database.repository';
import { ToolkitOverrideEntity } from 'src/modules/tool/repository/entities/toolkit-override.entity';

@Injectable()
export class ToolkitOverrideRepository extends DatabaseRepository<ToolkitOverrideEntity> {
    constructor(em: EntityManager) {
        super(em, ToolkitOverrideEntity);
    }

    async findBySlug(slug: string): Promise<ToolkitOverrideEntity | null> {
        return this.findOne({ slug, deleted: false });
    }

    async findAllBySlug(): Promise<Map<string, ToolkitOverrideEntity>> {
        // Ordered so custom toolkits keep their place across catalog pages.
        const rows = await this.find(
            { deleted: false },
            { orderBy: { slug: 'asc' } }
        );
        return new Map(rows.map(row => [row.slug, row]));
    }
}
