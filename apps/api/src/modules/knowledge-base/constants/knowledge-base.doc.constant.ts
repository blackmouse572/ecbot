import {
    ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
    ENUM_KNOWLEDGE_BASE_ITEM_STATUSES,
} from '../enums/knowledge-base-item-status.enum';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
    ENUM_KNOWLEDGE_BASE_ITEM_TYPES,
} from '../enums/knowledge-base-item-type.enum';

export const KnowledgeBaseDocParamsKnowledgeBaseId = [
    {
        name: 'knowledgeBaseId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '41146d1f-be8a-4dff-bbe3-47424a374838',
    },
];

export const KnowledgeBaseDocParamsItemId = [
    {
        name: 'id',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'bab80caa-50d0-496a-9d19-c8a3c3c93520',
    },
];

export const KnowledgeBaseDocParamsFolderId = [
    {
        name: 'folderId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '4976c652-c176-47f9-99df-3c80cb7d2223',
    },
];

export const KnowledgeBaseDocParamsTagId = [
    {
        name: 'tagId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'e572d33e-dbc3-45f2-857b-1ce34654d81c',
    },
];

export const KnowledgeBaseDocQueryItemType = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: ENUM_KNOWLEDGE_BASE_ITEM_TYPES.join(','),
        description: "value with ',' delimiter",
    },
];

export const KnowledgeBaseDocQueryItemStatus = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: ENUM_KNOWLEDGE_BASE_ITEM_STATUSES.join(','),
        description: "value with ',' delimiter",
    },
];

export const KnowledgeBaseDocQueryItemTags = [
    {
        name: 'tags',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'FAQ,How-to,Troubleshooting',
        description:
            'comma-separated tag names to filter items that contain any of these tags',
    },
];
