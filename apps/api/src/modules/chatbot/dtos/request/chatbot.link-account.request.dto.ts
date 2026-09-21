import { PickType } from '@nestjs/swagger';
import { ChatbotCreateRequestDto } from './chatbot.create.request.dto';

export class ChatbotLinkAccountRequestDto extends PickType(
    ChatbotCreateRequestDto,
    ['accounts'] as const
) {}
