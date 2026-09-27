import { OmitType, PartialType } from '@nestjs/swagger';
import { ChatbotCreateRequestDto } from './chatbot.create.request.dto';

// Every create field is editable except `workspace`, which the controller
// sets from the route param rather than the request body. All optional:
// the update writes only the keys the body sends.
export class ChatbotUpdateRequestDto extends PartialType(
    OmitType(ChatbotCreateRequestDto, ['workspace'] as const)
) {}
