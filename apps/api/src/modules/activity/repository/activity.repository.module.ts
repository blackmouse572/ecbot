import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ActivityEntity } from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';

@Module({
    providers: [ActivityRepository],
    exports: [ActivityRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([ActivityEntity])],
})
export class ActivityRepositoryModule {}
