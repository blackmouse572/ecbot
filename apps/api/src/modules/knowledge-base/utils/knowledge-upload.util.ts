import { UnprocessableEntityException } from '@nestjs/common';
import { ENUM_FILE_MIME_DOCUMENT } from '@app/common/file/enums/file.enum';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@app/common/request/enums/request.status-code.enum';
import {
    KNOWLEDGE_FILE_MAX_BYTES,
    KNOWLEDGE_FILE_MIMES,
    KNOWLEDGE_MEDIA_IMAGE_MAX_BYTES,
    KNOWLEDGE_MEDIA_IMAGE_MIMES,
    KNOWLEDGE_MEDIA_PDF_MAX_BYTES,
} from '../constants/knowledge-upload.constant';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';

const refuse = (message: string) =>
    new UnprocessableEntityException({
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
        message: `knowledgeItem.error.${message}`,
    });

/**
 * The file a knowledge item is created with fits its type: FILE takes
 * documents read for their text, MEDIA takes images and PDFs the agent sends.
 * Checked before anything is saved, rather than failing later at ingest.
 */
export function assertKnowledgeUpload(
    type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
    file?: { mimetype: string; size: number }
): void {
    const isFile = type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE;
    const isMedia = type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA;
    if (!isFile && !isMedia) return;
    if (!file) throw refuse('fileRequired');

    const mime = file.mimetype.toLowerCase();
    let maxBytes: number;
    if (isFile) {
        if (!KNOWLEDGE_FILE_MIMES.some(m => m === mime))
            throw refuse('fileTypeInvalid');
        maxBytes = KNOWLEDGE_FILE_MAX_BYTES;
    } else if (mime === ENUM_FILE_MIME_DOCUMENT.PDF) {
        maxBytes = KNOWLEDGE_MEDIA_PDF_MAX_BYTES;
    } else if (KNOWLEDGE_MEDIA_IMAGE_MIMES.some(m => m === mime)) {
        maxBytes = KNOWLEDGE_MEDIA_IMAGE_MAX_BYTES;
    } else {
        throw refuse('mediaTypeInvalid');
    }
    if (file.size > maxBytes) throw refuse('fileTooLarge');
}
