import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';

@Module({
    providers: [UserRepository],
    exports: [UserRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([UserEntity])],
})
export class UserRepositoryModule {}
