import { Migration } from '@mikro-orm/migrations';
import sharp from 'sharp';

// Sender avatars used to be stored as full-size base64 data URLs (up to
// ~750 KB), pulled from the database on every inbox poll. New ones are
// stored as 128px JPEGs (fetch-as-base64.util.ts); rewrite the old ones the
// same way. A 128px JPEG is well under 20,000 characters, so small rows are
// skipped. A row that isn't a decodable image is left as is. Not reversible:
// the originals are not kept, and platforms resend profiles weekly anyway.
export class Migration20261126100000_shrink_sender_avatars extends Migration {
    override async up(): Promise<void> {
        for (const table of ['conversations', 'contact_points']) {
            const rows = (await this.execute(
                `select "id", "sender_avatar" from "${table}" where "sender_avatar" like 'data:%' and length("sender_avatar") > 20000`
            )) as { id: string; sender_avatar: string }[];

            for (const row of rows) {
                const base64 = row.sender_avatar.split(',')[1] ?? '';
                let jpeg: Buffer;

                try {
                    jpeg = await sharp(Buffer.from(base64, 'base64'))
                        .resize(128, 128, { fit: 'cover' })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                } catch {
                    continue;
                }

                await this.execute(
                    `update "${table}" set "sender_avatar" = ? where "id" = ?`,
                    [
                        `data:image/jpeg;base64,${jpeg.toString('base64')}`,
                        row.id,
                    ]
                );
            }
        }
    }

    override async down(): Promise<void> {
        // Nothing to undo: the smaller avatars are still valid avatars.
    }
}
