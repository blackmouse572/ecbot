import { Embeddable, Embedded, Property } from '@mikro-orm/postgresql';
import { AwsS3MultipartPartEntity } from 'src/modules/aws/repository/entities/aws.s3-multipart-part.entity';

@Embeddable()
export class AwsS3MultipartEntity {
    @Property({ type: 'varchar', length: 255 })
    uploadId: string;

    @Property({ type: 'varchar', length: 255 })
    bucket: string;

    @Property({ type: 'varchar', length: 500 })
    key: string;

    @Property({ type: 'varchar', length: 1000 })
    completedUrl: string;

    @Property({ type: 'varchar', length: 1000, nullable: true })
    cdnUrl?: string;

    @Property({ type: 'varchar', length: 100 })
    mime: string;

    @Property({ type: 'varchar', length: 10 })
    extension: string;

    @Property({ type: 'decimal', precision: 15, scale: 2 })
    size: number;

    @Property({ type: 'integer' })
    lastPartNumber: number;

    @Property({ type: 'integer' })
    maxPartNumber: number;

    @Embedded(() => AwsS3MultipartPartEntity, { array: true })
    parts: AwsS3MultipartPartEntity[] = [];
}
