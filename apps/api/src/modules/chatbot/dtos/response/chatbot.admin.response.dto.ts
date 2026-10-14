import { ChatbotGetDetailResponseDto } from './chatbot.detail.response.dto';

// The admin views share the owner's detail shape: workspace plus accounts.
export class ChatbotAdminResponseDto extends ChatbotGetDetailResponseDto {}
