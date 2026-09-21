import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { VerificationEntity } from 'src/modules/verification/repository/entity/verification.entity';
import { VerificationRepository } from 'src/modules/verification/repository/repositories/verification.repository';

@Module({
    providers: [VerificationRepository],
    exports: [VerificationRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([VerificationEntity])],
})
export class VerificationRepositoryModule {}
