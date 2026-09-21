import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { FacebookActivityEntity } from './entities/facebook-activity.entity';
import { FacebookActivityRepository } from './repositories/facebook-activity.repository';

const imports = [MikroOrmModule.forFeature([FacebookActivityEntity])];
const providers = [FacebookActivityRepository];

@Module({ imports, providers, exports: providers })
export class FacebookActivityRepositoryModule {}
