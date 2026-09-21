import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ResetPasswordEntity } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { ResetPasswordRepository } from 'src/modules/reset-password/repository/repositories/reset-password.repository';

@Module({
    providers: [ResetPasswordRepository],
    exports: [ResetPasswordRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([ResetPasswordEntity])],
})
export class ResetPasswordRepositoryModule {}
