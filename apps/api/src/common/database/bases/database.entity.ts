import { Entity, Index, ManyToOne, Property, Rel } from '@mikro-orm/postgresql';
import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { randomUUID as uuidV4 } from 'node:crypto';

@Entity()
@Index({ properties: ['deleted'] })
@Index({ properties: ['createdAt'] })
@Index({ properties: ['updatedAt'] })
@Index({ properties: ['deletedAt'] })
export class DatabaseEntityBase {
    @IsOptional()
    @Property({
        type: 'uuid',
        defaultRaw: 'gen_random_uuid()',
        primary: true,
    })
    id: string = uuidV4();

    @Property({ type: 'boolean', default: false })
    deleted: boolean = false;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt: Date = new Date();

    @ManyToOne('UserEntity', { nullable: true })
    @Exclude({ toPlainOnly: true })
    createdBy?: Rel<any>;

    @Property({
        type: 'timestamptz',
        onUpdate: () => new Date(),
        nullable: true,
    })
    updatedAt?: Date;

    @ManyToOne('UserEntity', { nullable: true })
    @Exclude({ toPlainOnly: true })
    updatedBy?: Rel<any>;

    @Property({ type: 'timestamptz', nullable: true })
    deletedAt?: Date;

    @ManyToOne('UserEntity', { nullable: true })
    @Exclude({ toPlainOnly: true })
    deletedBy?: Rel<any>;
}
