import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotRepository } from '@app/modules/chatbot/repository/repositories/chatbot.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

@Module({
    providers: [ChatbotRepository],
    exports: [ChatbotRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([ChatbotEntity])],
})
export class ChatbotRepositoryModule {}
