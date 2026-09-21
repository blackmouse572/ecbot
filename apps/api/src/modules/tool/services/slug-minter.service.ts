import { Injectable } from '@nestjs/common';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';

function slugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class SlugMinter {
    constructor(private readonly toolRepo: ToolRepository) {}

    /**
     * Takes a desired base string and workspace id, returns the first unused slug.
     * Algorithm: try `base`, then `base-2`, `base-3`, etc.
     */
    async mint(base: string, workspaceId: string): Promise<string> {
        const slug = slugify(base);
        let candidate = slug;
        let counter = 2;

        while (true) {
            const exists = await this.toolRepo.findOne({
                workspace: { id: workspaceId },
                slug: candidate,
            });

            if (!exists) {
                return candidate;
            }

            candidate = `${slug}-${counter}`;
            counter++;
        }
    }
}
