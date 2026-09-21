// apps/api/test/modules/chatbot/controllers/chatbot-preview.public.controller.spec.ts
import { ChatbotPreviewPublicController } from '../../../../src/modules/chatbot/controllers/chatbot-preview.public.controller';
import { ChatbotPreviewStreamRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.preview-stream.request.dto';
import { ENUM_CHATBOT_STATUS } from '../../../../src/modules/chatbot/enums/chatbot.enum';
import { ENUM_TURNSTILE_ACTION } from '../../../../src/common/turnstile/enums/turnstile.action.enum';

const activeChatbot = {
    id: 'cb1',
    name: 'Ecbot Assistant',
    avatar: 'https://cdn.example.com/a.png',
    welcomeMessage: 'Xin chao',
    primaryLanguage: 'vi',
    generalKnowledge: 'SECRET SYSTEM PROMPT',
    modelTextName: 'anthropic/claude-sonnet-4.5',
    modelProvider: 'openrouter',
    guardrailCustomInstruction: 'SECRET GUARDRAIL',
    status: ENUM_CHATBOT_STATUS.ACTIVE,
};

const EXP_SECONDS = 1787327788;
const payload = {
    chatbotId: 'cb1',
    workspaceId: 'ws1',
    jti: 'jti1',
    exp: EXP_SECONDS,
};

function setup(overrides: Record<string, any> = {}) {
    const chatbotService = {
        findOne: jest.fn().mockResolvedValue(activeChatbot),
        ...(overrides.chatbotService ?? {}),
    };
    const shareTokenService = {
        verify: jest.fn().mockReturnValue(payload),
        ...(overrides.shareTokenService ?? {}),
    };
    const previewService = {
        streamTo: jest.fn().mockResolvedValue(undefined),
        ...(overrides.previewService ?? {}),
    };
    const previewSessionService = {
        publicKey: jest.fn().mockReturnValue('pub-key'),
        claimTurn: jest.fn().mockResolvedValue(true),
        claimTokenTurn: jest.fn().mockResolvedValue(true),
        isVerified: jest.fn().mockResolvedValue(false),
        markVerified: jest.fn().mockResolvedValue(undefined),
        ...(overrides.previewSessionService ?? {}),
    };
    const turnstileService = {
        verify: jest.fn().mockResolvedValue(undefined),
        ...(overrides.turnstileService ?? {}),
    };

    const controller = new ChatbotPreviewPublicController(
        chatbotService as never,
        shareTokenService as never,
        previewService as never,
        previewSessionService as never,
        turnstileService as never
    );

    return {
        controller,
        chatbotService,
        shareTokenService,
        previewService,
        previewSessionService,
        turnstileService,
    };
}

function streamDto(): ChatbotPreviewStreamRequestDto {
    const dto = new ChatbotPreviewStreamRequestDto();
    dto.token = 'tok';
    dto.message = 'hello';
    dto.chat_session_id = '550e8400-e29b-41d4-a716-446655440000';
    dto.turnstileToken = 'cf-token';
    return dto;
}

describe('ChatbotPreviewPublicController', () => {
    describe('meta', () => {
        it('returns only the public fields', async () => {
            const { controller } = setup();
            const result = await controller.meta('tok');

            expect(result.data).toEqual({
                name: 'Ecbot Assistant',
                avatar: 'https://cdn.example.com/a.png',
                welcomeMessage: 'Xin chao',
                primaryLanguage: 'vi',
                expiresAt: new Date(EXP_SECONDS * 1000),
            });
        });

        it('never leaks the prompt, model or guardrail config', async () => {
            const { controller } = setup();
            const result = await controller.meta('tok');

            const serialized = JSON.stringify(result.data);
            expect(serialized).not.toContain('SECRET');
            expect(serialized).not.toContain('claude-sonnet');
            expect(serialized).not.toContain('openrouter');
        });

        // The standalone page shows how long the link stays usable, so the
        // expiry has to come back with the profile rather than be decoded from
        // the token in the browser.
        it('reports when the link expires', async () => {
            const { controller } = setup();
            const result = await controller.meta('tok');

            expect(result.data.expiresAt).toEqual(new Date(EXP_SECONDS * 1000));
        });

        it('propagates an invalid token', async () => {
            const { controller } = setup({
                shareTokenService: {
                    verify: jest.fn(() => {
                        throw new Error('invalid');
                    }),
                },
            });

            await expect(controller.meta('bad')).rejects.toThrow('invalid');
        });
    });

    describe('chatbot resolution', () => {
        // The token carries the chatbot id, but the lookup is still scoped to
        // the token's workspace so a swapped id cannot cross tenants.
        it('resolves the chatbot under the token workspace and excludes deleted', async () => {
            const { controller, chatbotService } = setup();
            await controller.meta('tok');

            expect(chatbotService.findOne).toHaveBeenCalledWith({
                id: 'cb1',
                workspace: 'ws1',
                deletedAt: null,
            });
        });

        it('404s when the chatbot is gone', async () => {
            const { controller } = setup({
                chatbotService: { findOne: jest.fn().mockResolvedValue(null) },
            });

            await expect(controller.meta('tok')).rejects.toMatchObject({
                response: { message: 'chatbot.error.previewNotAvailable' },
            });
        });

        it.each([ENUM_CHATBOT_STATUS.INACTIVE, ENUM_CHATBOT_STATUS.ARCHIVED])(
            'refuses a %s chatbot on a public link',
            async status => {
                const { controller } = setup({
                    chatbotService: {
                        findOne: jest
                            .fn()
                            .mockResolvedValue({ ...activeChatbot, status }),
                    },
                });

                await expect(controller.meta('tok')).rejects.toMatchObject({
                    response: { message: 'chatbot.error.previewNotAvailable' },
                });
            }
        );
    });

    describe('stream', () => {
        it('streams through the shared preview service with a public session key', async () => {
            const { controller, previewService, previewSessionService } =
                setup();
            const res = {} as never;

            await controller.stream(res, streamDto());

            expect(previewSessionService.publicKey).toHaveBeenCalledWith({
                token: 'tok',
                sessionId: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(previewService.streamTo).toHaveBeenCalledWith(
                res,
                expect.objectContaining({
                    chatbot: activeChatbot,
                    sessionKey: 'pub-key',
                    message: 'hello',
                })
            );
        });

        it('refuses once the session turn budget is spent', async () => {
            const { controller, previewService } = setup({
                previewSessionService: {
                    publicKey: jest.fn().mockReturnValue('pub-key'),
                    claimTokenTurn: jest.fn().mockResolvedValue(true),
                    claimTurn: jest.fn().mockResolvedValue(false),
                },
            });

            await expect(
                controller.stream({} as never, streamDto())
            ).rejects.toMatchObject({
                response: { message: 'chatbot.error.previewSessionLimit' },
            });
            expect(previewService.streamTo).not.toHaveBeenCalled();
        });

        it('refuses once the share token hourly budget is spent', async () => {
            const { controller, previewService } = setup({
                previewSessionService: {
                    publicKey: jest.fn().mockReturnValue('pub-key'),
                    claimTokenTurn: jest.fn().mockResolvedValue(false),
                    claimTurn: jest.fn().mockResolvedValue(true),
                },
            });

            await expect(
                controller.stream({} as never, streamDto())
            ).rejects.toMatchObject({
                response: { message: 'chatbot.error.previewSessionLimit' },
            });
            expect(previewService.streamTo).not.toHaveBeenCalled();
        });

        it('does not stream for an archived chatbot', async () => {
            const { controller, previewService } = setup({
                chatbotService: {
                    findOne: jest.fn().mockResolvedValue({
                        ...activeChatbot,
                        status: ENUM_CHATBOT_STATUS.ARCHIVED,
                    }),
                },
            });

            await expect(
                controller.stream({} as never, streamDto())
            ).rejects.toMatchObject({
                response: { message: 'chatbot.error.previewNotAvailable' },
            });
            expect(previewService.streamTo).not.toHaveBeenCalled();
        });
    });
    // An anonymous LLM endpoint is a free-inference farm without this.
    describe('turnstile', () => {
        it('verifies the challenge on the first turn of a session', async () => {
            const { controller, turnstileService, previewSessionService } =
                setup();

            await controller.stream({} as never, streamDto());

            // Scoped to this action so a token solved on the login form
            // cannot be replayed to open a preview session.
            expect(turnstileService.verify).toHaveBeenCalledWith(
                'cf-token',
                ENUM_TURNSTILE_ACTION.CHATBOT_PREVIEW
            );
            expect(previewSessionService.markVerified).toHaveBeenCalledWith(
                'pub-key'
            );
        });

        // Turnstile tokens are single-use; re-challenging every message would
        // put a widget in front of every turn.
        it('skips the challenge once the session is verified', async () => {
            const { controller, turnstileService, previewService } = setup({
                previewSessionService: {
                    publicKey: jest.fn().mockReturnValue('pub-key'),
                    claimTurn: jest.fn().mockResolvedValue(true),
                    claimTokenTurn: jest.fn().mockResolvedValue(true),
                    isVerified: jest.fn().mockResolvedValue(true),
                    markVerified: jest.fn(),
                },
            });

            await controller.stream({} as never, streamDto());

            expect(turnstileService.verify).not.toHaveBeenCalled();
            expect(previewService.streamTo).toHaveBeenCalled();
        });

        it('does not stream when the challenge fails', async () => {
            const { controller, previewService, previewSessionService } = setup(
                {
                    turnstileService: {
                        verify: jest.fn().mockRejectedValue(new Error('bot')),
                    },
                }
            );

            await expect(
                controller.stream({} as never, streamDto())
            ).rejects.toThrow('bot');
            expect(previewService.streamTo).not.toHaveBeenCalled();
            expect(previewSessionService.markVerified).not.toHaveBeenCalled();
        });

        // Budget is spent before the challenge otherwise, letting a bot burn
        // a session's quota with tokens it never had to solve.
        it('does not spend the turn budget when the challenge fails', async () => {
            const { controller, previewSessionService } = setup({
                turnstileService: {
                    verify: jest.fn().mockRejectedValue(new Error('bot')),
                },
            });

            await expect(
                controller.stream({} as never, streamDto())
            ).rejects.toThrow('bot');
            expect(previewSessionService.claimTurn).not.toHaveBeenCalled();
            expect(previewSessionService.claimTokenTurn).not.toHaveBeenCalled();
        });

        it('checks the share token before spending a Turnstile verification', async () => {
            const { controller, turnstileService } = setup({
                shareTokenService: {
                    verify: jest.fn(() => {
                        throw new Error('expired');
                    }),
                },
            });

            await expect(
                controller.stream({} as never, streamDto())
            ).rejects.toThrow('expired');
            expect(turnstileService.verify).not.toHaveBeenCalled();
        });
    });
});
