import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { COUNTRY_SEED_DATA } from 'src/migration/data/country.data';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';

@Injectable()
export class MigrationCountrySeed {
    constructor(private readonly em: EntityManager) {}

    @Command({
        command: 'seed:country',
        describe: 'seeds countries',
    })
    async seeds(): Promise<void> {
        try {
            // Fork for a request-scoped context (global EM is disallowed — see
            // DatabaseOptionService.allowGlobalContext=false).
            const em = this.em.fork();
            const existing = new Set(
                (
                    await em.find(
                        CountryEntity,
                        {},
                        { fields: ['alpha2Code'] }
                    )
                ).map(country => country.alpha2Code)
            );
            for (const countryData of COUNTRY_SEED_DATA) {
                if (existing.has(countryData.alpha2Code)) continue;
                em.persist(em.create(CountryEntity, countryData));
            }

            await em.flush();
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    @Command({
        command: 'remove:country',
        describe: 'remove countries',
    })
    async remove(): Promise<void> {
        try {
            await this.em.nativeDelete(CountryEntity, {});
        } catch (err: any) {
            throw new Error(err.message);
        }
    }
}
