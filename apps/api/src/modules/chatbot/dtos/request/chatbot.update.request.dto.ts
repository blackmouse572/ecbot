import { OmitType } from '@nestjs/swagger';
import { ChatbotCreateRequestDto } from './chatbot.create.request.dto';

// Every create field is editable except `workspace`, which the controller
// sets from the route param rather than the request body.
export class ChatbotUpdateRequestDto extends OmitType(ChatbotCreateRequestDto, [
    'workspace',
] as const) {}
