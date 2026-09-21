import { OmitType } from '@nestjs/swagger';
import { RAGGetResponseDto } from './rag.get.response.dto';

export class RAGListResponseDto extends OmitType(RAGGetResponseDto, [
    'workspace',
]) {}
export class RAGListByChatbotResponseDto extends OmitType(RAGGetResponseDto, [
    'workspace',
    'chatbot',
]) {}

export class RAGAdminListReponseDto extends RAGGetResponseDto {}
