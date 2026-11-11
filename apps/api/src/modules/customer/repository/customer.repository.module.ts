import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ContactPointEntity } from './entities/contact-point.entity';
import { CustomerMarketingStateEntity } from './entities/customer-marketing-state.entity';
import { MarketingEventEntity } from './entities/marketing-event.entity';
import { CustomerMarketingStateRepository } from './repositories/customer-marketing-state.repository';
import { MarketingEventRepository } from './repositories/marketing-event.repository';
import { CustomerMergeSuggestionEntity } from './entities/customer-merge-suggestion.entity';
import { CustomerTagAssignmentEntity } from './entities/customer-tag-assignment.entity';
import { CustomerTagEventEntity } from './entities/customer-tag-event.entity';
import { CustomerTagEntity } from './entities/customer-tag.entity';
import { CustomerEntity } from './entities/customer.entity';
import { TrackedLinkEntity } from './entities/tracked-link.entity';
import { ContactPointRepository } from './repositories/contact-point.repository';
import { CustomerMergeSuggestionRepository } from './repositories/customer-merge-suggestion.repository';
import { CustomerTagAssignmentRepository } from './repositories/customer-tag-assignment.repository';
import { CustomerTagEventRepository } from './repositories/customer-tag-event.repository';
import { CustomerTagRepository } from './repositories/customer-tag.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { TrackedLinkRepository } from './repositories/tracked-link.repository';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            CustomerEntity,
            ContactPointEntity,
            CustomerTagEntity,
            CustomerTagAssignmentEntity,
            CustomerTagEventEntity,
            CustomerMergeSuggestionEntity,
            CustomerMarketingStateEntity,
            MarketingEventEntity,
            TrackedLinkEntity,
        ]),
    ],
    providers: [
        CustomerRepository,
        ContactPointRepository,
        CustomerTagRepository,
        CustomerTagAssignmentRepository,
        CustomerTagEventRepository,
        CustomerMergeSuggestionRepository,
        CustomerMarketingStateRepository,
        MarketingEventRepository,
        TrackedLinkRepository,
    ],
    exports: [
        CustomerRepository,
        ContactPointRepository,
        CustomerTagRepository,
        CustomerTagAssignmentRepository,
        CustomerTagEventRepository,
        CustomerMergeSuggestionRepository,
        CustomerMarketingStateRepository,
        MarketingEventRepository,
        TrackedLinkRepository,
    ],
})
export class CustomerRepositoryModule {}
