import { Embeddable, ManyToOne, Property } from '@mikro-orm/postgresql';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';

@Embeddable()
export class UserMobileNumberEntity {
    @ManyToOne(() => CountryEntity)
    country: CountryEntity;

    @Property({ type: 'varchar', length: 20 })
    number: string;
}

export type UserMobileNumberDoc = UserMobileNumberEntity;
