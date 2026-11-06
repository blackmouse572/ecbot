import { HttpStatus, NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'events';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ChatbotPreviewClientController } from '../../../../src/modules/chatbot/controllers/chatbot-preview.client.controller';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';

// The preview chat over the /client surface, which the Ecbot MCP Server's
// test_chatbot tool calls. Same turn as the app's preview chat, answered as
// one JSON body.
describe('ChatbotPreviewClientController', () => {
    const workspace = { id: 'ws1' } as never;
    const credential = { id: 'cred1', createdBy: { id: 'user1' } } as never;
    const chatbot = { id: 'cb1' };
    const answer = {
        reply: 'Dạ có ạ',
        media: [],
        toolCalls: [],
        blocked: false,
    };

    const chatbotService = { findOne: jest.fn() };
    const previewService = { reply: jest.fn() };
    const rateLimit = { claim: jest.fn() };
    const previewSessionService = {
        workspaceKey: jest.fn(
            (p: Record<string, string>) =>
                `${p.workspaceId}:${p.chatbotId}:${p.userId}:${p.sessionId}`
        ),
    };
    let controller: ChatbotPreviewClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        chatbotService.findOne.mockResolvedValue(chatbot);
        previewService.reply.mockResolvedValue(answer);
        rateLimit.claim.mockResolvedValue(true);
        controller = new ChatbotPreviewClientController(
            chatbotService as never,
            previewService as never,
            previewSessionService as never,
            rateLimit as never
        );
    });

    /** The Express response, whose close tells us the caller went away. */
    function fakeRes(writableFinished = false) {
        return Object.assign(new EventEmitter(), { writableFinished }) as never;
    }

    it('is mounted at /chatbots', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, ChatbotPreviewClientController)
        ).toBe('/chatbots');
    });

    it('needs the same chatbot read ability as the app preview', () => {
        const handler = ChatbotPreviewClientController.prototype.preview;
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            ClientCredentialGuard,
            ClientCredentialPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                handler
            )
        ).toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.CHATBOT,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ]);
    });

    it('looks the chatbot up inside the credential workspace only', async () => {
        await controller.preview(
            workspace,
            credential,
            'cb1',
            {
                message: 'hi',
            },
            fakeRes()
        );

        expect(chatbotService.findOne).toHaveBeenCalledWith({
            id: 'cb1',
            workspace: 'ws1',
            deletedAt: null,
        });
    });

    it('404s for a chatbot outside the workspace', async () => {
        chatbotService.findOne.mockResolvedValue(null);

        await expect(
            controller.preview(
                workspace,
                credential,
                'cb9',
                { message: 'hi' },
                fakeRes()
            )
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(previewService.reply).not.toHaveBeenCalled();
    });

    it('continues the session it is given, keyed to the credential', async () => {
        const result = await controller.preview(
            workspace,
            credential,
            'cb1',
            {
                message: 'hi',
                sessionId: 'test-1',
            },
            fakeRes()
        );

        expect(previewService.reply).toHaveBeenCalledWith({
            chatbot,
            sessionKey: 'ws1:cb1:cred1:test-1',
            message: 'hi',
            userId: 'user1',
            chatSessionId: 'test-1',
            signal: expect.any(AbortSignal),
        });
        expect(result.data).toEqual({ sessionId: 'test-1', ...answer });
    });

    it('starts a new session when none is given', async () => {
        const first = await controller.preview(
            workspace,
            credential,
            'cb1',
            {
                message: 'hi',
            },
            fakeRes()
        );
        const second = await controller.preview(
            workspace,
            credential,
            'cb1',
            {
                message: 'hi',
            },
            fakeRes()
        );

        expect(first.data.sessionId).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
        expect(second.data.sessionId).not.toBe(first.data.sessionId);
    });

    it('stops the turn when the caller goes away before the reply', async () => {
        const res = fakeRes();
        await controller.preview(
            workspace,
            credential,
            'cb1',
            { message: 'hi' },
            res
        );
        const { signal } = previewService.reply.mock.calls[0][0];

        (res as EventEmitter).emit('close');

        expect(signal.aborted).toBe(true);
    });

    it('leaves a turn alone once its reply was sent', async () => {
        const res = fakeRes(true);
        await controller.preview(
            workspace,
            credential,
            'cb1',
            { message: 'hi' },
            res
        );
        const { signal } = previewService.reply.mock.calls[0][0];

        (res as EventEmitter).emit('close');

        expect(signal.aborted).toBe(false);
    });

    // A script holding a key could otherwise run turns (and the bot's Tools)
    // as fast as apps/ai answers, with only the token quota as a ceiling.
    it('limits each key to a budget of turns a minute', async () => {
        rateLimit.claim.mockResolvedValue(false);

        await expect(
            controller.preview(
                workspace,
                credential,
                'cb1',
                { message: 'hi' },
                fakeRes()
            )
        ).rejects.toMatchObject({
            status: HttpStatus.TOO_MANY_REQUESTS,
            response: { message: 'chatbot.error.previewRateLimited' },
        });
        expect(rateLimit.claim).toHaveBeenCalledWith(
            'chatbot-preview:cred1',
            20,
            60
        );
        expect(previewService.reply).not.toHaveBeenCalled();
    });
});
