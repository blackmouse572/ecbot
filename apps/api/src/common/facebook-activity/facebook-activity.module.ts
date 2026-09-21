import { Module } from '@nestjs/common';
import { FacebookActivityRepositoryModule } from './repository/facebook-activity.repository.module';
import { FacebookActivityService } from './services/facebook-activity.service';

const imports = [FacebookActivityRepositoryModule];
const providers = [FacebookActivityService];

@Module({ imports, providers, exports: providers })
export class FacebookActivityModule {}
