import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConversationActivityEntity } from './entities/conversation-activity.entity';
import { ConversationReadEntity } from './entities/conversation-read.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { ConversationActivityRepository } from './repositories/conversation-activity.repository';
import { ConversationReadRepository } from './repositories/conversation-read.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            ConversationEntity,
            MessageEntity,
            ConversationReadEntity,
            ConversationActivityEntity,
        ]),
    ],
    providers: [
        ConversationRepository,
        MessageRepository,
        ConversationReadRepository,
        ConversationActivityRepository,
    ],
    exports: [
        ConversationRepository,
        MessageRepository,
        ConversationReadRepository,
        ConversationActivityRepository,
    ],
})
export class ConversationRepositoryModule {}
