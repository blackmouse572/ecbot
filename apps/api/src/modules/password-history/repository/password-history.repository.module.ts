import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { PasswordHistoryEntity } from 'src/modules/password-history/repository/entities/password-history.entity';
import { PasswordHistoryRepository } from 'src/modules/password-history/repository/repositories/password-history.repository';

@Module({
    providers: [PasswordHistoryRepository],
    exports: [PasswordHistoryRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([PasswordHistoryEntity])],
})
export class PasswordHistoryRepositoryModule {}
