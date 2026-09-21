import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@app/modules/api-key/enums/api-key.status-code.enum';
import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotService } from '../services/chatbot.service';

@Injectable()
export class ChatbotParsePipe implements PipeTransform {
    constructor(private readonly chatbotService: ChatbotService) {}

    async transform(value: any): Promise<ChatbotEntity> {
        const chatbot: ChatbotEntity =
            await this.chatbotService.findOneById(value);
        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        return chatbot;
    }
}
