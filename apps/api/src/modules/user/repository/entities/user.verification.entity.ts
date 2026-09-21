import { Embeddable, Property } from '@mikro-orm/postgresql';

@Embeddable()
export class UserVerificationEntity {
    @Property({ type: 'boolean', default: false })
    email: boolean;

    @Property({ type: 'timestamptz', nullable: true })
    emailVerifiedDate?: Date;

    @Property({ type: 'boolean', default: false })
    mobileNumber: boolean;

    @Property({ type: 'timestamptz', nullable: true })
    mobileNumberVerifiedDate?: Date;
}
