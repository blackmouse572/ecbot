import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { AwsS3ResponseDto } from '@app/modules/aws/dtos/response/aws.s3-response.dto';
import { ChatbotGetDetailShortResponseDto } from '@app/modules/chatbot/dtos/response/chatbot.detail.response.dto';
import { WorkSpaceListResponseDto } from '@app/modules/workspace/dtos/response/workspace.list.response';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ENUM_RAG_STATUS } from '../../enums/rag.status.enum';

export class RAGGetResponseDto extends DatabaseDto {
    @ApiProperty({
        enum: ENUM_RAG_STATUS,
        description: 'Current status of the RAG process',
        example: ENUM_RAG_STATUS.IN_PROGRESS,
    })
    status: ENUM_RAG_STATUS;

    @ApiProperty({
        description: 'Chatbot that this document rag belong to',
        type: ChatbotGetDetailShortResponseDto,
        required: true,
        oneOf: [{ $ref: getSchemaPath(ChatbotGetDetailShortResponseDto) }],
    })
    @Type(() => ChatbotGetDetailShortResponseDto)
    chatbot: ChatbotGetDetailShortResponseDto;

    @ApiProperty({
        description: 'Workspace that this document rag belong to',
        type: WorkSpaceListResponseDto,
        required: true,
        oneOf: [{ $ref: getSchemaPath(WorkSpaceListResponseDto) }],
    })
    @Type(() => WorkSpaceListResponseDto)
    workspace: WorkSpaceListResponseDto;

    @ApiProperty({
        description: 'Attachment to the RAG process',
        type: AwsS3ResponseDto,
        required: true,
        oneOf: [{ $ref: getSchemaPath(AwsS3ResponseDto) }],
    })
    @Type(() => AwsS3ResponseDto)
    attachment: AwsS3ResponseDto;
}
