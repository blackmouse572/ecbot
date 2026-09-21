import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';
import { CountryRepository } from 'src/modules/country/repository/repositories/country.repository';

@Module({
    providers: [CountryRepository],
    exports: [CountryRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([CountryEntity])],
})
export class CountryRepositoryModule {}
