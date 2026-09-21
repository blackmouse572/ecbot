import { ApiProperty } from '@nestjs/swagger';
import {
    IsDefined,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
    ValidateIf,
} from 'class-validator';
import { ENUM_RAG_INGEST_PROCESS } from '../constants/knowledge-ingest.constant';

export class KnowledgeIngestTaskDto {
    @ApiProperty({ enum: ENUM_RAG_INGEST_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_RAG_INGEST_PROCESS)
    jobName: ENUM_RAG_INGEST_PROCESS;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    knowledgeItemId: string;

    @ApiProperty({ required: false, type: String, isArray: true })
    @ValidateIf(
        dto =>
            dto.jobName === ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS ||
            dto.chatbotIds !== undefined
    )
    @IsDefined()
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    chatbotIds?: string[];
}
