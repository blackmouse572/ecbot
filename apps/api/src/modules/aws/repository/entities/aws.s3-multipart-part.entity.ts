import { Embeddable, Property } from '@mikro-orm/postgresql';

@Embeddable()
export class AwsS3MultipartPartEntity {
    @Property({ type: 'varchar', length: 255 })
    eTag: string;

    @Property({ type: 'integer' })
    partNumber: number;

    @Property({ type: 'decimal', precision: 15, scale: 2 })
    size: number;
}
