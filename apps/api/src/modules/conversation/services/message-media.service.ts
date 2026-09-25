import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    MESSAGE_MEDIA_EXTENSIONS,
    MESSAGE_MEDIA_KEY_PREFIX,
} from '../constants/message-media.constant';
import {
    IMessageAttachment,
    IMessageMedia,
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
            { key, file: media.data, size: media.data.length },
            PRIVATE
        );
        return { type: 'image', key };
    }

    /** Stored attachments → `{ type, url }` for the inbox and the AI. */
    async resolve(attachments?: unknown[]): Promise<IMessageAttachment[]> {
        const valid = (attachments ?? []).filter(
            (a): a is IMessageAttachment =>
                typeof (a as IMessageAttachment | null)?.type === 'string'
        );
        return Promise.all(valid.map(a => this.resolveOne(a)));
    }

    private async resolveOne({
        type,
        url,
        key,
    }: IMessageAttachment): Promise<IMessageAttachment> {
        if (!key) return url ? { type, url } : { type };
        try {
            return { type, url: await this.s3.signGetUrl(key, PRIVATE) };
        } catch (err) {
            this.logger.warn(
                `presign failed for ${key}: ${(err as Error).message}`
            );
            return { type };
        }
    }
}
