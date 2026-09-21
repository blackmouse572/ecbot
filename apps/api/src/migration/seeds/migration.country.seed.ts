import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
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
            const data = [
                {
                    name: 'Indonesia',
                    alpha2Code: 'ID',
                    alpha3Code: 'IDN',
                    fipsCode: 'ID',
                    numericCode: '360',
                    phoneCode: ['62'],
                    continent: 'Asia',
                    timeZone: 'Asia/Jakarta',
                    currency: 'IDR',
                },
            ];

            // Fork for a request-scoped context (global EM is disallowed — see
            // DatabaseOptionService.allowGlobalContext=false).
            const em = this.em.fork();
            for (const countryData of data) {
                const existing = await em.findOne(CountryEntity, {
                    alpha2Code: countryData.alpha2Code,
                });
                if (existing) continue;
                const country = em.create(CountryEntity, countryData);
                em.persist(country);
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
