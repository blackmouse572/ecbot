import { PREVIEW_MEDIA_KEY_PREFIX } from '@app/modules/conversation/constants/message-media.constant';
import {
    IChatUpload,
    IMessageAttachment,
    IStoredChatUpload,
} from '@app/modules/conversation/interfaces/message-media.interface';
import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';
import {
    attachmentNote,
    uploadType,
    withinChatUploadLimits,
} from '@app/modules/conversation/utils/message-attachment';
import {
    imageDescriptionNote,
    UNVIEWABLE_IMAGE_NOTE,
} from '@app/modules/platform/constants/media.constant';
import {
    Injectable,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ENUM_CHATBOT_STATUS_CODE_ERROR } from '../enums/chatbot.status-code.enum';
import {
    IChatbotPreviewAttachment,
    IChatbotPreviewNotes,
} from '../interfaces/chatbot-preview-media.interface';
import { AIDescribedImages, ChatbotAIService } from './chatbot-ai.service';

/**
 * Files attached in a preview chat. They are stored like a customer's
 * photo and read the same way, so the preview shows how the agent will
 * answer one on a real channel: images are described by the vision model,
 * any other file arrives as a file the agent cannot open.
 */
@Injectable()
export class ChatbotPreviewMediaService {
    private readonly logger = new Logger(ChatbotPreviewMediaService.name);

    constructor(
        private readonly media: MessageMediaService,
        private readonly chatbotAIService: ChatbotAIService
    ) {}

    /** Stores one upload; refuses a missing file, or a type or size the
     *  chat does not take. */
    async save(
        chatbotId: string,
        upload: IChatUpload | undefined
    ): Promise<IStoredChatUpload> {
        const saved =
            upload &&
            (await this.media.saveUpload(this.folder(chatbotId), upload));
        if (!saved) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_CHATBOT_STATUS_CODE_ERROR.ATTACHMENT_NOT_SUPPORTED,
                message: 'chatbot.error.attachmentNotSupported',
            });
        }
        return saved;
    }

    /** One note per attachment, in order. Keys outside this chatbot's folder
     *  are dropped: the private bucket holds other people's files. */
    async notes(
        chatbotId: string,
        attachments: IChatbotPreviewAttachment[]
    ): Promise<IChatbotPreviewNotes> {
        const folder = `${this.folder(chatbotId)}/`;
        const own = withinChatUploadLimits(
            attachments.flatMap(({ key }): IMessageAttachment[] =>
                key.startsWith(folder) ? [{ type: uploadType(key), key }] : []
            )
        );
        const resolved = await this.media.resolveIn(own, folder);
        const images = resolved.flatMap((a, index) =>
            a.type === 'image' && a.url
                ? [{ id: String(index), url: a.url }]
                : []
        );
        const described = images.length
            ? await this.describe(chatbotId, images)
            : undefined;
        const byId = new Map(
            described?.images.map(d => [d.id, d.description]) ?? []
        );

        const notes = own.map((a, index) => {
            if (a.type !== 'image') return attachmentNote(a);
            const description = byId.get(String(index));
            return description
                ? imageDescriptionNote(description)
                : UNVIEWABLE_IMAGE_NOTE;
        });
        return described?.usage
            ? { notes, usage: described.usage, model: described.model }
            : { notes };
    }

    private async describe(
        chatbotId: string,
        images: { id: string; url: string }[]
    ): Promise<AIDescribedImages | undefined> {
        try {
            return await this.chatbotAIService.describeImages({
                chatbot_id: chatbotId,
                images,
            });
        } catch (err) {
            this.logger.warn(
                `Describing preview images failed: ${(err as Error).message}`
            );
            return undefined;
        }
    }

    private folder(chatbotId: string): string {
        return `${PREVIEW_MEDIA_KEY_PREFIX}/${chatbotId}`;
    }
}
