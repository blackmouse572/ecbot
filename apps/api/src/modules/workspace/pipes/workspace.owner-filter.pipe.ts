import { Injectable, PipeTransform } from '@nestjs/common';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';

// `?owner=` on the admin workspace list: a case-insensitive match on the
// owner's name or email. Nested under `owner` so it never collides with the
// top-level `$or` that `search` builds.
@Injectable()
export class WorkspaceOwnerFilterPipe implements PipeTransform {
    transform(value?: string): Record<string, any> | undefined {
        const owner = value?.trim();
        if (!owner) return;

        return {
            owner: {
                $or: ['name', 'email'].map(field =>
                    DatabaseHelperQueryContain(field, owner, {
                        ignoreCase: true,
                    })
                ),
            },
        };
    }
}
