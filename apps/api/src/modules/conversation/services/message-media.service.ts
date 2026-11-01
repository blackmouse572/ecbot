import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    uploadType,
    withinChatUploadLimits,
} from '../utils/message-attachment';
import {
    CHAT_UPLOAD_FILE_EXTENSIONS,
    CHAT_UPLOAD_FILE_MAX_BYTES,
    MESSAGE_MEDIA_EXTENSIONS,
    MESSAGE_MEDIA_KEY_PREFIX,
    MESSAGE_MEDIA_MAX_BYTES,
} from '../constants/message-media.constant';
import {
    IChatUpload,
    IMessageAttachment,
    IMessageMedia,
    IStoredChatUpload,
} from '../interfaces/message-media.interface';

const PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };

/**
 * Customer images are copied into the private bucket when they arrive:
 * platform links expire (Messenger, Zalo) or embed credentials (Telegram,
 * WhatsApp), and the photos can be personal. Readers get presigned URLs.
 */
@Injectable()
export class MessageMediaService {
    private readonly logger = new Logger(MessageMediaService.name);

    constructor(private readonly s3: AwsS3Service) {}

    async saveImage(
        conversationId: string,
        media: IMessageMedia
    ): Promise<IMessageAttachment> {
        const ext = MESSAGE_MEDIA_EXTENSIONS[media.mime] ?? 'jpg';
        const key = `${MESSAGE_MEDIA_KEY_PREFIX}/${conversationId}/${randomUUID()}.${ext}`;
        await this.s3.putItem(
            {
                key,
                file: media.data,
                size: media.data.length,
                mime: media.mime,
            },
            PRIVATE
        );
        return { type: 'image', key };
    }

    /** A file a person attached in a chat we host, stored privately under
     *  `folder`. Undefined when its type is not one we take or it is too
     *  big: images up to the size the AI can describe, documents up to
     *  CHAT_UPLOAD_FILE_MAX_BYTES. */
    async saveUpload(
        folder: string,
        upload: IChatUpload
    ): Promise<IStoredChatUpload | undefined> {
        const imageExt = MESSAGE_MEDIA_EXTENSIONS[upload.mimetype];
        const ext = imageExt ?? CHAT_UPLOAD_FILE_EXTENSIONS[upload.mimetype];
        const max = imageExt
            ? MESSAGE_MEDIA_MAX_BYTES
            : CHAT_UPLOAD_FILE_MAX_BYTES;
        if (!ext || upload.size > max) return undefined;

        const key = `${folder}/${randomUUID()}.${ext}`;
        await this.s3.putItem(
            {
                key,
                file: upload.buffer,
                size: upload.size,
                mime: upload.mimetype,
            },
            PRIVATE
        );
        return {
            type: imageExt ? 'image' : 'file',
            key,
            name: upload.originalname.slice(0, 255),
        };
    }

    /** Uploads staged in `folder` before their conversation existed (the
     *  website widget), copied into the conversation's folder so every
     *  reader signs them like any customer photo. Keys outside `folder`
     *  are dropped. */
    async adopt(
        folder: string,
        conversationId: string,
        uploads: { key: string; name?: string }[]
    ): Promise<IMessageAttachment[]> {
        const own = withinChatUploadLimits(
            uploads.flatMap(({ key, name }) =>
                key.startsWith(`${folder}/`)
                    ? [{ type: uploadType(key), key, name }]
                    : []
            )
        );
        return Promise.all(
            own.map(async ({ type, key, name }) => {
                const ext = key.split('.').pop() ?? '';
                const target = `${MESSAGE_MEDIA_KEY_PREFIX}/${conversationId}/${randomUUID()}.${ext}`;
                await this.s3.copyItem(key, target, PRIVATE);
                return { type, key: target, ...(name && { name }) };
            })
        );
    }

    /** Stored attachments → `{ type, url }` for the inbox and the AI. Only
     *  keys under this conversation's folder are signed: the private bucket
     *  holds other files too. */
    async resolve(
        attachments: IMessageAttachment[] | undefined,
        conversationId: string
    ): Promise<IMessageAttachment[]> {
        return this.resolveIn(
            attachments,
            `${MESSAGE_MEDIA_KEY_PREFIX}/${conversationId}/`
        );
    }

    /** `resolve` for any folder (ends with `/`); keys outside it stay
     *  unsigned. */
    async resolveIn(
        attachments: IMessageAttachment[] | undefined,
        folder: string
    ): Promise<IMessageAttachment[]> {
        return Promise.all(
            (attachments ?? []).map(a => this.resolveOne(a, folder))
        );
    }

    private async resolveOne(
        { type, url, key, emoji, name }: IMessageAttachment,
        folder: string
    ): Promise<IMessageAttachment> {
        const base: IMessageAttachment = {
            type,
            ...(emoji && { emoji }),
            ...(name && { name }),
        };
        if (!key) return url ? { ...base, url } : base;
        if (!key.startsWith(folder)) return base;
        try {
            return { ...base, url: await this.s3.signGetUrl(key, PRIVATE) };
        } catch (err) {
            this.logger.warn(
                `presign failed for ${key}: ${(err as Error).message}`
            );
            return base;
        }
    }
}
