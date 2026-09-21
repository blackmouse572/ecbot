import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class CountryRepository extends DatabaseRepository<CountryEntity> {
    constructor(em: EntityManager) {
        super(em, CountryEntity);
    }
}
