import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AnalyticsRepository } from './repository/repositories/analytics.repository';
import { AnalyticsService } from './services/analytics.service';

@Module({
    imports: [MikroOrmModule.forFeature([CustomerEntity])],
    providers: [AnalyticsRepository, AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
