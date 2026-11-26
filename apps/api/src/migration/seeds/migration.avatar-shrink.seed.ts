import { toAvatarDataUrl } from '@app/common/utils/fetch-as-base64.util';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command, Option } from 'nestjs-command';

export interface IAvatarShrinkCounts {
    shrunk: number;
    failed: number;
}

// A 128px JPEG avatar is well under this; anything bigger is pre-resize.
const SMALL_AVATAR_CHARS = 20000;
const TABLES = ['conversations', 'contact_points'] as const;

/**
 * One-off: avatars stored before they were resized are full-size base64 data
 * URLs (up to ~750 KB), pulled from the DB on every inbox poll. Rewrite each
 * as the same 128px JPEG new avatars get. Idempotent: small rows are skipped.
 */
@Injectable()
export class MigrationAvatarShrinkSeed {
    constructor(private readonly em: EntityManager) {}

    async shrink(dryRun: boolean): Promise<IAvatarShrinkCounts> {
        const counts: IAvatarShrinkCounts = { shrunk: 0, failed: 0 };
        const connection = this.em.getConnection();

        for (const table of TABLES) {
            const rows: { id: string; sender_avatar: string }[] =
                await connection.execute(
                    `select id, sender_avatar from ${table} where sender_avatar like 'data:%' and length(sender_avatar) > ${SMALL_AVATAR_CHARS}`
                );
            for (const row of rows) {
                let avatar: string;
                try {
                    const base64 = row.sender_avatar.split(',')[1] ?? '';
                    avatar = await toAvatarDataUrl(
                        Buffer.from(base64, 'base64')
                    );
                } catch {
                    counts.failed++;
                    process.stderr.write(
                        `${table} ${row.id}: not a decodable image, left as is\n`
                    );
                    continue;
                }
                if (!dryRun) {
                    await connection.execute(
                        `update ${table} set sender_avatar = ? where id = ?`,
                        [avatar, row.id]
                    );
                }
                counts.shrunk++;
            }
        }

        return counts;
    }

    @Command({
        command: 'avatar:shrink',
        describe: 'resize stored full-size sender avatars to 128px JPEGs',
    })
    async run(
        @Option({
            name: 'dry-run',
            type: 'boolean',
            default: false,
            describe: 'report the count without writing',
        })
        dryRun: boolean
    ): Promise<void> {
        const counts = await this.shrink(dryRun);
        // stdout, not the Nest logger: `cli.ts` limits it to error/fatal.
        process.stdout.write(
            `${dryRun ? '[dry-run] would shrink' : 'shrunk'}: ${counts.shrunk}, failed: ${counts.failed}\n`
        );
    }
}
