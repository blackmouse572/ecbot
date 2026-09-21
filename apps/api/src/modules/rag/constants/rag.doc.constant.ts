import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { ENUM_RAG_STATUS } from '../enums/rag.status.enum';

export const RAG_SEARCHABLE_FIELDS: string[] = [
    'status',
    'chatbot',
    'attachment.originalname',
];

export const BasedRAGDocParams: ApiParamOptions[] = [
    ...WorkspaceDocParamsId,
    {
        name: 'chatbot',
        description: 'Chatbot ID',
        required: true,
        type: 'string',
    },
];

export const RAGDocParamsId: ApiParamOptions[] = [
    {
        name: 'rag',
        description: 'RAG file ID',
        required: true,
        type: 'string',
    },
];

export const RAGDocListQuery: ApiQueryOptions[] = [
    {
        name: 'status',
        required: false,
        description: 'Filter by RAG file status',
        enum: ENUM_RAG_STATUS,
        example: ENUM_RAG_STATUS.COMPLETED,
        type: 'string',
    },
];

export const RAGDocAdminListQuery: ApiQueryOptions[] = [
    ...RAGDocListQuery,
    {
        name: 'workspace',
        required: false,
        description: 'Filter by Workspace ID',
        type: 'string',
    },
    {
        name: 'chatbot',
        required: false,
        description: 'Filter by Chatbot ID',
        type: 'string',
    },
];
