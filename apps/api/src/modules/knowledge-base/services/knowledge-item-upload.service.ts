import { randomUUID } from 'crypto';
import {
    Injectable,
    InternalServerErrorException,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
import slugify from 'slugify';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { FileContentPipe } from 'src/common/file/pipes/file.content.pipe';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';
import { HelperEgressService } from 'src/common/helper/services/helper.egress.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '../../aws/enums/aws.enum';
import { AwsS3Entity } from '../../aws/repository/entities/aws.s3.entity';
import { AwsS3Service } from '../../aws/services/aws.s3.service';
import {
    KNOWLEDGE_UPLOAD_MAX_BYTES,
    KNOWLEDGE_UPLOAD_PRESIGN_SECONDS,
    KNOWLEDGE_UPLOAD_STAGING_PREFIX,
} from '../constants/knowledge-upload.constant';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import {
    IKnowledgeItemStoredFile,
    IKnowledgeItemUploadUrl,
} from '../interfaces/knowledge-item-upload.interface';
import { assertKnowledgeUpload } from '../utils/knowledge-upload.util';
import { KnowledgeStorageQuotaService } from './knowledge-storage-quota.service';

const refuse = (message: string) =>
    new UnprocessableEntityException({
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
        message: `knowledgeItem.error.${message}`,
    });

/**
 * Gets a FILE or MEDIA item's file into storage, whichever way it arrives:
 * a multipart upload, a presigned upload the caller made, or a public URL.
 * Every path runs the same checks (type, size, bytes, storage quota).
 */
@Injectable()
export class KnowledgeItemUploadService {
    private readonly logger = new Logger(KnowledgeItemUploadService.name);

    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly storageQuota: KnowledgeStorageQuotaService,
        private readonly egress: HelperEgressService
    ) {}

    /** Checks `file` and stores it, returning the item's attachment. */
    async store(
        workspaceId: string,
        knowledgeBaseId: string,
        type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        file: IFile
    ): Promise<IKnowledgeItemStoredFile> {
        assertKnowledgeUpload(type, file);
        await new FileContentPipe().transform(file);
        await this.storageQuota.assertCanStore(workspaceId, file.size);

        const isMedia = type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA;
        const safeFileName = this.safeFileName(file.originalname);
        const ext = safeFileName.split('.').pop();
        // Media is public so the channels can fetch it when the agent sends
        // it; the random id keeps its address unguessable. It is a folder so
        // the link ends in the file name, which Messenger and Telegram show.
        const key = isMedia
            ? `knowledge-media/${workspaceId}/${knowledgeBaseId}/${randomUUID()}/${safeFileName}`
            : `knowledge-items/${workspaceId}/${knowledgeBaseId}/${Date.now()}-${safeFileName}`;

        try {
            const uploaded = await this.awsS3Service.putItem(
                {
                    key,
                    file: file.buffer,
                    size: file.size,
                    // Channels and browsers fetch media by its link, so it
                    // must say what it is (checked above).
                    ...(isMedia && { mime: file.mimetype }),
                },
                {
                    access: isMedia
                        ? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
                        : ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                }
            );
            const attachment: AwsS3Entity = {
                bucket: uploaded.bucket,
                key: uploaded.key,
                completedUrl: uploaded.completedUrl,
                cdnUrl: uploaded.cdnUrl,
                mime: file.mimetype,
                size: file.size,
                extension: ext,
            };
            return {
                attachment,
                metadata: { fileName: safeFileName, mimeType: file.mimetype },
            };
        } catch (error: unknown) {
            this.logger.error(
                `Failed to upload file to S3: ${error instanceof Error ? error.message : JSON.stringify(error)}`
            );
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'knowledgeItem.error.uploadFailed',
                _error:
                    error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * A presigned PUT for a file the caller uploads itself; the item is then
     * created with the returned `fileKey`. Type and size are checked now so
     * a file that would be refused is never uploaded.
     */
    async createUploadUrl(
        workspaceId: string,
        knowledgeBaseId: string,
        type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        fileName: string,
        size: number
    ): Promise<IKnowledgeItemUploadUrl> {
        const key = `${this.stagingDir(workspaceId, knowledgeBaseId)}${randomUUID()}-${this.safeFileName(fileName)}`;
        const { mime } = this.awsS3Service.getFileInfo(key);
        assertKnowledgeUpload(type, { mimetype: mime, size });
        await this.storageQuota.assertCanStore(workspaceId, size);

        const presign = await this.awsS3Service.presignPutItem(key, size, {
            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            expired: KNOWLEDGE_UPLOAD_PRESIGN_SECONDS,
        });
        return {
            uploadUrl: presign.presignUrl,
            fileKey: key,
            mimeType: mime,
            expiresIn: KNOWLEDGE_UPLOAD_PRESIGN_SECONDS,
        };
    }

    /** The file a presigned upload put at `fileKey`. */
    async readUpload(
        workspaceId: string,
        knowledgeBaseId: string,
        fileKey: string
    ): Promise<IFile> {
        const dir = this.stagingDir(workspaceId, knowledgeBaseId);
        if (!fileKey.startsWith(dir) || fileKey.includes('..')) {
            throw refuse('uploadKeyInvalid');
        }
        let buffer: Buffer;
        try {
            buffer = await this.awsS3Service.getItemBuffer(fileKey, {
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            });
        } catch {
            throw refuse('uploadNotFound');
        }
        const { filename, mime } = this.awsS3Service.getFileInfo(fileKey);
        // Drop the random id the key starts with.
        return this.toFile(
            buffer,
            filename.replace(/^[0-9a-f-]{36}-/, ''),
            mime
        );
    }

    /** Removes a presigned upload once its item has its own copy. */
    async discardUpload(fileKey: string): Promise<void> {
        try {
            await this.awsS3Service.deleteItem(fileKey, {
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            });
        } catch (error: unknown) {
            this.logger.warn(
                `Could not delete staged upload ${fileKey}: ${String(error)}`
            );
        }
    }

    /**
     * Downloads a public file. The egress fetch refuses private and metadata
     * addresses, also after a redirect, and stops past the upload limit.
     */
    async download(url: string): Promise<IFile> {
        let res: Response;
        let buffer: Buffer;
        try {
            res = await this.egress.fetch(
                url,
                {},
                { maxBytes: KNOWLEDGE_UPLOAD_MAX_BYTES }
            );
            buffer = Buffer.from(await res.arrayBuffer());
        } catch (error: unknown) {
            this.logger.warn(`Download of ${url} failed: ${String(error)}`);
            throw refuse('fileDownloadFailed');
        }
        if (!res.ok) throw refuse('fileDownloadFailed');

        const path = new URL(url).pathname;
        const fileName = decodeURIComponent(path.split('/').pop() || 'file');
        const declared = res.headers
            .get('content-type')
            ?.split(';')[0]
            .trim()
            .toLowerCase();
        // Servers often send octet-stream; the extension says more then.
        const mime =
            declared && declared !== 'application/octet-stream'
                ? declared
                : this.awsS3Service.getFileInfo(fileName).mime;
        return this.toFile(buffer, fileName, mime);
    }

    private stagingDir(workspaceId: string, knowledgeBaseId: string): string {
        return `${KNOWLEDGE_UPLOAD_STAGING_PREFIX}/${workspaceId}/${knowledgeBaseId}/`;
    }

    private safeFileName(rawName: string): string {
        const originalName = readableName(rawName);
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const ext = originalName.includes('.')
            ? originalName.split('.').pop()
            : '';
        const sanitizedName = slugify(nameWithoutExt, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
            trim: true,
        });
        return `${sanitizedName || 'file'}${ext ? `.${ext}` : ''}`;
    }

    private toFile(buffer: Buffer, originalname: string, mimetype: string) {
        return {
            buffer,
            originalname,
            mimetype,
            size: buffer.length,
        } as IFile;
    }
}

/**
 * A file name as the person typed it. Multipart uploads read the name as
 * latin1, so a UTF-8 name ("Mộc") arrives garbled; macOS names also carry
 * accents as separate marks. "đ" has no plain-letter form, so it is spelled
 * "d" here before slugify turns it into "dj".
 */
function readableName(name: string): string {
    let fixed = name;
    if (/^[\u0000-\u00ff]*$/.test(name)) {
        const utf8 = Buffer.from(name, 'latin1').toString('utf8');
        if (!utf8.includes('\ufffd')) fixed = utf8;
    }
    return fixed.normalize('NFC').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
