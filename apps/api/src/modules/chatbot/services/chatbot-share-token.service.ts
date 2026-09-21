import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ENUM_CHATBOT_STATUS_CODE_ERROR } from '../enums/chatbot.status-code.enum';

/** Discriminator so a token minted elsewhere can never open a preview. */
const SHARE_TOKEN_TYPE = 'chatbot-preview';
const SHARE_TOKEN_ALGORITHM = 'HS256';

export interface IChatbotShareTokenPayload {
    chatbotId: string;
    workspaceId: string;
    typ: typeof SHARE_TOKEN_TYPE;
    jti: string;
    exp: number;
    iat: number;
}

/**
 * Signs and verifies the public preview share link (issue #80).
 *
 * Self-contained HS256 with its own secret, following the workspace invitation
 * link. Deliberately stateless: a link cannot be revoked, only outlived, so the
 * expiry is clamped and cost is capped per `jti` by ChatbotPreviewSessionService.
 * The `jti` is carried anyway, so a denylist can be added later without
 * changing the token format.
 */
@Injectable()
export class ChatbotShareTokenService {
    private readonly secret?: string;
    private readonly maxExpiresInMs: number;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {
        const config = this.configService.get<{
            secret?: string;
            maxExpiresInMs: number;
        }>('chatbot.share');
        this.secret = config?.secret;
        this.maxExpiresInMs = config?.maxExpiresInMs;
    }

    create({
        chatbotId,
        workspaceId,
        expiresInMs,
    }: {
        chatbotId: string;
        workspaceId: string;
        expiresInMs: number;
    }): { token: string; expiresAt: Date } {
        if (!this.secret) {
            throw new InternalServerErrorException({
                statusCode:
                    ENUM_CHATBOT_STATUS_CODE_ERROR.SHARE_LINK_NOT_CONFIGURED,
                message: 'chatbot.error.shareLinkNotConfigured',
            });
        }

        const ttlMs = Math.min(expiresInMs, this.maxExpiresInMs);
        const token = this.jwtService.sign(
            { chatbotId, workspaceId, typ: SHARE_TOKEN_TYPE },
            {
                secret: this.secret,
                algorithm: SHARE_TOKEN_ALGORITHM,
                expiresIn: Math.floor(ttlMs / 1000),
                jwtid: randomUUID(),
            }
        );

        return { token, expiresAt: new Date(Date.now() + ttlMs) };
    }

    verify(token: string): IChatbotShareTokenPayload {
        let payload: IChatbotShareTokenPayload;
        try {
            payload = this.jwtService.verify<IChatbotShareTokenPayload>(token, {
                secret: this.secret ?? '',
                // Pinned so a forged `alg: none` (or an asymmetric key
                // confusion) can never be accepted.
                algorithms: [SHARE_TOKEN_ALGORITHM],
            });
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new UnauthorizedException({
                    statusCode: ENUM_CHATBOT_STATUS_CODE_ERROR.SHARE_LINK_EXPIRED,
                    message: 'chatbot.error.shareLinkExpired',
                });
            }
            throw this.invalid();
        }

        if (payload?.typ !== SHARE_TOKEN_TYPE || !payload.jti) throw this.invalid();

        return payload;
    }

    private invalid(): UnauthorizedException {
        return new UnauthorizedException({
            statusCode: ENUM_CHATBOT_STATUS_CODE_ERROR.SHARE_LINK_INVALID,
            message: 'chatbot.error.shareLinkInvalid',
        });
    }
}
