import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

@Module({
    providers: [AccountRepository],
    exports: [AccountRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([AccountEntity])],
})
export class AccountRepositoryModule {}
