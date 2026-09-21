import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { CustomerMergeSuggestionEntity } from '@app/modules/customer/repository/entities/customer-merge-suggestion.entity';
import { CustomerMergeSuggestionRepository } from '@app/modules/customer/repository/repositories/customer-merge-suggestion.repository';
import { ToolEntity } from '@app/modules/tool/repository/entities/tool.entity';
import { ToolRepository } from '@app/modules/tool/repository/repositories/tool.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NavCountService } from './services/nav-count.service';

// Self-contained: the three count repositories only need the (global)
// EntityManager, so we re-provide them here rather than coupling to the
// customer / account / tool modules.
@Module({
    imports: [
        MikroOrmModule.forFeature([
            CustomerMergeSuggestionEntity,
            AccountEntity,
            ToolEntity,
        ]),
    ],
    providers: [
        CustomerMergeSuggestionRepository,
        AccountRepository,
        ToolRepository,
        NavCountService,
    ],
    exports: [NavCountService],
})
export class NavCountModule {}
