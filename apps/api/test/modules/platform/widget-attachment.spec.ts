import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { WidgetPublicController } from '../../../src/modules/platform/controllers/widget.public.controller';

function setup(
    overrides: { allowed?: boolean; within?: boolean; saved?: unknown } = {}
) {
    const accountService = {
        findOne: jest.fn(async () => ({
            id: 'acc-1',
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            config: { allowedOrigins: ['https://shop.example.com'] },
            chatbot: { id: 'bot-1' },
        })),
    };
    const sessionService = {
        isOriginAllowed: jest.fn(() => overrides.allowed ?? true),
        sessionKey: jest.fn(() => 'session-1'),
        isVerified: jest.fn(async () => true),
        markVerified: jest.fn(),
        mediaFolder: jest.fn(() => 'widget-media/acc-1/abc'),
    };
    const turnstileService = { verify: jest.fn() };
    const rateLimit = {
        claim: jest.fn(async (_bucket: string) => overrides.within ?? true),
    };
    const messageMedia = {
        saveUpload: jest.fn(async () =>
            'saved' in overrides
                ? overrides.saved
                : {
                      type: 'image',
                      key: 'widget-media/acc-1/abc/x.jpg',
                      name: 'shirt.jpg',
                  }
        ),
    };
    const none = {} as any;
    const controller = new WidgetPublicController(
        accountService as any,
        none,
        none,
        sessionService as any,
        none,
        turnstileService as any,
        rateLimit as any,
        messageMedia as any
    );
    return { controller, messageMedia, rateLimit, sessionService };
}

const dto = {
    visitorId: 'v1',
    parentOrigin: 'https://shop.example.com',
} as any;
const file = {
    buffer: Buffer.from('x'),
    mimetype: 'image/jpeg',
    size: 1,
    originalname: 'shirt.jpg',
} as Express.Multer.File;

describe('WidgetPublicController.uploadAttachment', () => {
    it("stages the file in the visitor's folder and returns its key", async () => {
        const { controller, messageMedia, rateLimit } = setup();

        const out = await controller.uploadAttachment('key', dto, file);

        expect(messageMedia.saveUpload).toHaveBeenCalledWith(
            'widget-media/acc-1/abc',
            file
        );
        expect(rateLimit.claim).toHaveBeenCalledWith(
            'widget-upload:session-1',
            30,
            3600
        );
        expect(out.data).toEqual({
            type: 'image',
            key: 'widget-media/acc-1/abc/x.jpg',
            name: 'shirt.jpg',
        });
    });

    it('refuses a page that is not on the allowlist', async () => {
        const { controller, messageMedia } = setup({ allowed: false });
        await expect(
            controller.uploadAttachment('key', dto, file)
        ).rejects.toThrow();
        expect(messageMedia.saveUpload).not.toHaveBeenCalled();
    });

    it('refuses a visitor over the upload budget', async () => {
        const { controller, messageMedia } = setup({ within: false });
        await expect(
            controller.uploadAttachment('key', dto, file)
        ).rejects.toThrow();
        expect(messageMedia.saveUpload).not.toHaveBeenCalled();
    });

    it('caps uploads per widget too, since a visitor id can be reset', async () => {
        const { controller, messageMedia, rateLimit } = setup();
        rateLimit.claim.mockImplementation(
            async (bucket: string) =>
                !bucket.startsWith('widget-upload-account:')
        );

        await expect(
            controller.uploadAttachment('key', dto, file)
        ).rejects.toMatchObject({ status: 429 });
        expect(rateLimit.claim).toHaveBeenCalledWith(
            'widget-upload-account:acc-1',
            500,
            3600
        );
        expect(messageMedia.saveUpload).not.toHaveBeenCalled();
    });

    it('refuses a file type it does not take', async () => {
        const { controller } = setup({ saved: undefined });
        await expect(
            controller.uploadAttachment('key', dto, file)
        ).rejects.toThrow(/attachmentNotSupported/);
    });
});
