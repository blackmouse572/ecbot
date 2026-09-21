import { Embeddable, Property } from '@mikro-orm/postgresql';

@Embeddable()
export class AwsS3Entity {
    @Property({ type: 'varchar' })
    bucket: string;

    @Property({ type: 'varchar' })
    key: string;

    @Property({ type: 'varchar' })
    completedUrl: string;

    @Property({ type: 'varchar', nullable: true })
    cdnUrl?: string;

    @Property({ type: 'varchar' })
    mime: string;

    @Property({ type: 'varchar' })
    extension: string;

    @Property({ type: 'decimal', precision: 10, scale: 2 })
    size: number;
}
