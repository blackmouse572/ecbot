import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ContactPointEntity } from './entities/contact-point.entity';
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
        TrackedLinkRepository,
    ],
    exports: [
        CustomerRepository,
        ContactPointRepository,
        CustomerTagRepository,
        CustomerTagAssignmentRepository,
        CustomerTagEventRepository,
        CustomerMergeSuggestionRepository,
        TrackedLinkRepository,
    ],
})
export class CustomerRepositoryModule {}
