import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';
import {
    BasedRAGDocParams,
    RAGDocListQuery,
    RAGDocParamsId,
} from '../constants/rag.doc.constant';
import { RAGCreateWithFileRequestDto } from '../dtos/request/rag.create-with-file.request.dto';
import { RAGUploadFileRequestDto } from '../dtos/request/rag.upload-file.request.dto';
import { RAGGetResponseDto } from '../dtos/response/rag.get.response.dto';
import { RAGListByChatbotResponseDto } from '../dtos/response/rag.list.response.dto';

export function RAGUploadFileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'upload Excel, CSV, or PDF file for RAG processing',
            description:
                'Generate a presigned URL for uploading Excel files (XLSX), CSV files, or PDF documents that will be processed for RAG (Retrieval-Augmented Generation).',
        }),
        DocRequest({
            dto: RAGUploadFileRequestDto,
            params: BasedRAGDocParams,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<AwsS3PresignResponseDto>('rag.uploadFile', {
            dto: AwsS3PresignResponseDto,
            httpStatus: HttpStatus.OK,
        })
    );
}

export function RAGCreateWithFileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create RAG entry after file upload',
            description:
                'Create a RAG entry in the database after successfully uploading a file to AWS S3.',
        }),
        DocRequest({
            dto: RAGCreateWithFileRequestDto,
            params: BasedRAGDocParams,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<RAGGetResponseDto>('rag.create', {
            dto: RAGGetResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function RAGListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all RAG files for a chatbot',
            description:
                'Retrieve a paginated list of all RAG files associated with a specific chatbot in a workspace.',
        }),
        DocRequest({
            params: [...BasedRAGDocParams],
            queries: [...RAGDocListQuery],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging<RAGListByChatbotResponseDto>('rag.list', {
            dto: RAGListByChatbotResponseDto,
        })
    );
}

export function RAGGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get RAG file details',
            description:
                'Retrieve detailed information about a specific RAG file including its processing status and metadata.',
        }),
        DocRequest({
            params: [...RAGDocParamsId, ...BasedRAGDocParams],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<RAGGetResponseDto>('rag.get', {
            dto: RAGGetResponseDto,
        })
    );
}

export function RAGDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete RAG file',
            description:
                "Soft delete a RAG file and remove it from the chatbot's knowledge base.",
        }),
        DocRequest({
            params: [...RAGDocParamsId, ...BasedRAGDocParams],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('rag.delete', {
            httpStatus: HttpStatus.OK,
        })
    );
}
