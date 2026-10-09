import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';
import { MigrationRagPrivateBucketSeed } from 'src/migration/seeds/migration.rag-private-bucket.seed';

const PUBLIC = { access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC };
const PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };

// RAG files uploaded before the private bucket sit at guessable public URLs.
describe('MigrationRagPrivateBucketSeed', () => {
    let rows: any[];
    let ragRepository: { find: jest.Mock; save: jest.Mock };
    let s3: Record<string, jest.Mock>;
    let seed: MigrationRagPrivateBucketSeed;
    const forked = { id: 'forked-em' };

    beforeEach(() => {
        rows = [
            {
                id: 'r1',
                attachment: {
                    bucket: 'pub',
                    key: 'rag/w1/c1/a.pdf',
                    completedUrl: 'https://pub/rag/w1/c1/a.pdf',
                    cdnUrl: 'https://cdn/rag/w1/c1/a.pdf',
                    mime: 'application/pdf',
                    size: 10,
                },
            },
        ];
        ragRepository = {
            find: jest.fn().mockImplementation(async () => rows),
            save: jest.fn().mockImplementation(async e => e),
        };
        s3 = {
            getConfig: jest.fn((o: { access: string }) => ({
                bucket: o.access === 'PRIVATE' ? 'priv' : 'pub',
            })),
            getItemBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf')),
            putItem: jest.fn().mockResolvedValue({
                bucket: 'priv',
                key: 'rag/w1/c1/a.pdf',
                completedUrl: 'https://priv/rag/w1/c1/a.pdf',
                cdnUrl: undefined,
            }),
            deleteItem: jest.fn().mockResolvedValue(undefined),
            checkItem: jest.fn(),
        };
        seed = new MigrationRagPrivateBucketSeed(
            { fork: () => forked } as any,
            ragRepository as any,
            s3 as any
        );
    });

    it('only picks rows still stored in the public bucket', async () => {
        await seed.moveToPrivate(false);

        expect(ragRepository.find).toHaveBeenCalledWith(
            { attachment: { bucket: 'pub' } },
            { em: forked }
        );
    });

    it('copies to the private bucket, deletes the public object, then updates the row', async () => {
        const counts = await seed.moveToPrivate(false);

        expect(s3.getItemBuffer).toHaveBeenCalledWith(
            'rag/w1/c1/a.pdf',
            PUBLIC
        );
        expect(s3.putItem).toHaveBeenCalledWith(
            {
                key: 'rag/w1/c1/a.pdf',
                file: Buffer.from('pdf'),
                mime: 'application/pdf',
                size: 10,
            },
            PRIVATE
        );
        expect(s3.deleteItem).toHaveBeenCalledWith('rag/w1/c1/a.pdf', PUBLIC);
        expect(rows[0].attachment).toMatchObject({
            bucket: 'priv',
            completedUrl: 'https://priv/rag/w1/c1/a.pdf',
            cdnUrl: undefined,
        });
        expect(ragRepository.save).toHaveBeenCalledWith(rows[0], {
            em: forked,
        });
        expect(counts).toEqual({ moved: 1, failed: 0 });
    });

    it('refuses to run when both buckets are the same one', async () => {
        s3.getConfig.mockReturnValue({ bucket: 'one' });

        await expect(seed.moveToPrivate(false)).rejects.toThrow();
        expect(s3.deleteItem).not.toHaveBeenCalled();
    });

    it('writes nothing under --dry-run', async () => {
        const counts = await seed.moveToPrivate(true);

        expect(s3.putItem).not.toHaveBeenCalled();
        expect(s3.deleteItem).not.toHaveBeenCalled();
        expect(ragRepository.save).not.toHaveBeenCalled();
        expect(rows[0].attachment.bucket).toBe('pub');
        expect(counts).toEqual({ moved: 1, failed: 0 });
    });

    it('finishes a half-done move: public gone, private copy present', async () => {
        s3.getItemBuffer.mockRejectedValue(new Error('NoSuchKey'));
        s3.checkItem.mockResolvedValue({
            bucket: 'priv',
            completedUrl: 'https://priv/rag/w1/c1/a.pdf',
        });

        const counts = await seed.moveToPrivate(false);

        expect(s3.checkItem).toHaveBeenCalledWith('rag/w1/c1/a.pdf', PRIVATE);
        expect(s3.putItem).not.toHaveBeenCalled();
        expect(rows[0].attachment.bucket).toBe('priv');
        expect(counts).toEqual({ moved: 1, failed: 0 });
    });

    it('counts a file found in neither bucket as failed and leaves the row', async () => {
        s3.getItemBuffer.mockRejectedValue(new Error('NoSuchKey'));
        s3.checkItem.mockRejectedValue(new Error('NotFound'));

        const counts = await seed.moveToPrivate(false);

        expect(ragRepository.save).not.toHaveBeenCalled();
        expect(counts).toEqual({ moved: 0, failed: 1 });
    });
});
