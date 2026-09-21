import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConversationReadEntity } from './entities/conversation-read.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { ConversationReadRepository } from './repositories/conversation-read.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            ConversationEntity,
            MessageEntity,
            ConversationReadEntity,
        ]),
    ],
    providers: [
        ConversationRepository,
        MessageRepository,
        ConversationReadRepository,
    ],
    exports: [
        ConversationRepository,
        MessageRepository,
        ConversationReadRepository,
    ],
})
export class ConversationRepositoryModule {}
