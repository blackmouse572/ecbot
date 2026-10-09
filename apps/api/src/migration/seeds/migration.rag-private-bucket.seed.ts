import { AwsS3Dto } from '@app/modules/aws/dtos/aws.s3.dto';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { RAGEntity } from '@app/modules/rag/repository/entities/rag.entity';
import { RAGRepository } from '@app/modules/rag/repository/repositories/rag.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command, Option } from 'nestjs-command';

export interface IRagPrivateBucketCounts {
    moved: number;
    failed: number;
}

const PUBLIC = { access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC };
const PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };

/**
 * One-off: RAG files uploaded before they moved to the private bucket still
 * sit in the public one at guessable URLs. Copy each to the private bucket,
 * delete the public object, then point the row at the private copy.
 * Idempotent: rows already in the private bucket are not selected, and a run
 * that stopped after the public delete finishes from the private copy.
 */
@Injectable()
export class MigrationRagPrivateBucketSeed {
    constructor(
        private readonly em: EntityManager,
        private readonly ragRepository: RAGRepository,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async moveToPrivate(dryRun: boolean): Promise<IRagPrivateBucketCounts> {
        const counts: IRagPrivateBucketCounts = { moved: 0, failed: 0 };
        // Global EM is disallowed (allowGlobalContext=false).
        const em = this.em.fork();
        const publicBucket = this.awsS3Service.getConfig(PUBLIC).bucket;
        // One bucket for both: the delete would remove the only copy.
        if (publicBucket === this.awsS3Service.getConfig(PRIVATE).bucket) {
            throw new Error(
                'The public and private buckets are the same: nothing to move'
            );
        }
        // Soft-deleted rows too: their files are just as public.
        const rags = await this.ragRepository.find<RAGEntity>(
            { attachment: { bucket: publicBucket } },
            { em }
        );

        for (const rag of rags) {
            if (dryRun) {
                counts.moved++;
                continue;
            }
            const stored = await this.copyToPrivate(rag);
            if (!stored) {
                counts.failed++;
                process.stderr.write(
                    `rag ${rag.id}: ${rag.attachment.key} found in neither bucket, row left as is\n`
                );
                continue;
            }
            rag.attachment.bucket = stored.bucket;
            rag.attachment.completedUrl = stored.completedUrl;
            rag.attachment.cdnUrl = stored.cdnUrl;
            await this.ragRepository.save(rag, { em });
            counts.moved++;
        }

        return counts;
    }

    /** The private copy, or null when the file is in neither bucket. */
    private async copyToPrivate(rag: RAGEntity): Promise<AwsS3Dto | null> {
        const { key, mime, size } = rag.attachment;
        let file: Buffer;
        try {
            file = await this.awsS3Service.getItemBuffer(key, PUBLIC);
        } catch {
            // A previous run may have stopped after deleting the public copy.
            return this.awsS3Service.checkItem(key, PRIVATE).catch(() => null);
        }
        const stored = await this.awsS3Service.putItem(
            { key, file, mime, size },
            PRIVATE
        );
        await this.awsS3Service.deleteItem(key, PUBLIC);
        return stored;
    }

    @Command({
        command: 'rag:move-to-private',
        describe: 'move RAG files from the public bucket to the private bucket',
    })
    async move(
        @Option({
            name: 'dry-run',
            type: 'boolean',
            default: false,
            describe: 'report the count without copying or writing',
        })
        dryRun: boolean
    ): Promise<void> {
        const counts = await this.moveToPrivate(dryRun);
        // stdout, not the Nest logger: `cli.ts` limits it to error/fatal.
        process.stdout.write(
            `${dryRun ? '[dry-run] would move' : 'moved'}: ${counts.moved}, failed: ${counts.failed}\n`
        );
    }
}
