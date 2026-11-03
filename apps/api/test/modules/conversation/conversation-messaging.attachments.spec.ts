import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ConversationMessagingService } from '../../../src/modules/conversation/services/conversation-messaging.service';
import { MessageMediaService } from '../../../src/modules/conversation/services/message-media.service';

const MB = 1024 * 1024;

function setup(
    uploads?: Record<string, { maxBytes: number; types: string[] }>
) {
    const s3 = {
        putItem: jest.fn(async () => undefined),
        signGetUrl: jest.fn(async (key: string) => `https://s3/${key}?sig`),
        checkItem: jest.fn(async (key: string) => ({
            key,
            size: 2048,
            mime: key.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        })),
    };
    const conversation = {
        id: 'conv-1',
        senderId: 'psid-1',
        account: { id: 'acc-1', type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE },
    };
    const conversationRepository = {
        findOneByIdInWorkspace: jest.fn(async () => conversation),
    };
    const messageRepository = {
        insertPendingOutbound: jest.fn(
            async (_c: string, _n: string, data: any) => ({
                id: 'msg-1',
                ...data,
            })
        ),
        markOutboundSent: jest.fn(async () => undefined),
        markOutboundFailed: jest.fn(async () => undefined),
    };
    let sent = 0;
    const adapter = {
        capabilities: { reactions: { inbound: true, outbound: true }, uploads },
        sendMessage: jest.fn(async (..._args: unknown[]) => ({
            externalId: `mid.${++sent}`,
        })),
    };
    const service = new ConversationMessagingService(
        conversationRepository as any,
        messageRepository as any,
        {} as any,
        {} as any,
        { get: () => ({ get: () => adapter }) } as any,
        new MessageMediaService(s3 as any),
        {} as any
    );
    return { service, s3, adapter, messageRepository };
}

const messengerUploads = {
    image: { maxBytes: 5 * MB, types: ['image/jpeg', 'image/png'] },
    file: { maxBytes: 10 * MB, types: ['application/pdf'] },
};

const upload = (mimetype: string, size = 2048, originalname = 'a') => ({
    buffer: Buffer.from('x'),
    mimetype,
    size,
    originalname,
});

describe('ConversationMessagingService.saveAttachment', () => {
    it("stores a file the channel takes in the conversation's folder", async () => {
        const { service, s3 } = setup(messengerUploads);

        const saved = await service.saveAttachment(
            'conv-1',
            'ws-1',
            upload('image/jpeg', 2048, 'shirt.jpg')
        );

        expect(saved).toEqual({
            type: 'image',
            key: expect.stringMatching(/^conversations\/conv-1\/.+\.jpg$/),
            name: 'shirt.jpg',
        });
        expect(s3.putItem).toHaveBeenCalled();
    });

    it('refuses a kind the channel does not take', async () => {
        const { service, s3 } = setup({ image: messengerUploads.image });
        await expect(
            service.saveAttachment('conv-1', 'ws-1', upload('application/pdf'))
        ).rejects.toMatchObject({ status: 422 });
        expect(s3.putItem).not.toHaveBeenCalled();
    });

    it("refuses a file over the channel's size limit", async () => {
        const { service, s3 } = setup({
            image: { maxBytes: 1_000_000, types: ['image/jpeg'] },
        });
        await expect(
            service.saveAttachment(
                'conv-1',
                'ws-1',
                upload('image/jpeg', 2 * MB)
            )
        ).rejects.toMatchObject({ status: 422 });
        expect(s3.putItem).not.toHaveBeenCalled();
    });

    it('refuses any file on a text-only channel', async () => {
        const { service } = setup(undefined);
        await expect(
            service.saveAttachment('conv-1', 'ws-1', upload('image/jpeg'))
        ).rejects.toMatchObject({ status: 422 });
    });
});

describe('ConversationMessagingService.sendOperatorReply with attachments', () => {
    const photos = [
        { key: 'conversations/conv-1/a.jpg', name: 'a.jpg' },
        { key: 'conversations/conv-1/b.jpg', name: 'b.jpg' },
    ];

    it('sends each photo as its own message, then the text', async () => {
        const { service, adapter, messageRepository } = setup(messengerUploads);

        const message = await service.sendOperatorReply(
            'conv-1',
            'ws-1',
            'op-1',
            'Both are in stock',
            photos
        );

        expect(adapter.sendMessage).toHaveBeenCalledTimes(3);
        expect(adapter.sendMessage.mock.calls[0][2]).toMatchObject({
            content: {
                kind: 'media',
                mediaType: 'image',
                url: 'https://s3/conversations/conv-1/a.jpg?sig',
                size: 2048,
                mimeType: 'image/jpeg',
            },
        });
        expect(adapter.sendMessage.mock.calls[2][2]).toMatchObject({
            content: { kind: 'text', text: 'Both are in stock' },
        });
        expect(messageRepository.insertPendingOutbound).toHaveBeenCalledWith(
            'conv-1',
            expect.any(String),
            expect.objectContaining({
                attachments: [
                    { type: 'image', key: photos[0].key, name: 'a.jpg' },
                    { type: 'image', key: photos[1].key, name: 'b.jpg' },
                ],
            })
        );
        expect(message.externalId).toBe('mid.3');
    });

    it('sends a file with its name and no text', async () => {
        const { service, adapter } = setup(messengerUploads);

        await service.sendOperatorReply('conv-1', 'ws-1', 'op-1', '', [
            { key: 'conversations/conv-1/c.pdf', name: 'menu.pdf' },
        ]);

        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(adapter.sendMessage.mock.calls[0][2]).toMatchObject({
            content: { kind: 'media', mediaType: 'file', name: 'menu.pdf' },
        });
    });

    it("ignores keys outside the conversation's folder", async () => {
        const { service, adapter } = setup(messengerUploads);

        await service.sendOperatorReply('conv-1', 'ws-1', 'op-1', 'hi', [
            { key: 'conversations/conv-2/x.jpg' },
        ]);

        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('refuses a message with no text and no attachments it can send', async () => {
        const { service, messageRepository } = setup(messengerUploads);
        await expect(
            service.sendOperatorReply('conv-1', 'ws-1', 'op-1', ' ', [
                { key: 'conversations/conv-2/x.jpg' },
            ])
        ).rejects.toMatchObject({ status: 400 });
        expect(messageRepository.insertPendingOutbound).not.toHaveBeenCalled();
    });
});
