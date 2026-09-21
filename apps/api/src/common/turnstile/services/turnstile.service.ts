import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_TURNSTILE_ACTION } from 'src/common/turnstile/enums/turnstile.action.enum';
import { ENUM_TURNSTILE_STATUS_CODE_ERROR } from 'src/common/turnstile/enums/turnstile.status-code.enum';

interface ITurnstileSiteverifyResponse {
    success?: boolean;
    action?: string;
    'error-codes'?: string[];
    metadata?: { result_with_testing_key?: boolean };
}

@Injectable()
export class TurnstileService {
    private readonly logger = new Logger(TurnstileService.name);

    private readonly secretKey?: string;
    private readonly verifyUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.secretKey = this.configService.get<string>('turnstile.secretKey');
        this.verifyUrl = this.configService.get<string>('turnstile.verifyUrl');
    }

    /**
     * Gates a public endpoint on Cloudflare Turnstile.
     *
     * No secret configured (local dev / tests) means CAPTCHA is off. Otherwise
     * `success` and the `action` the widget was rendered with must both hold.
     *
     * Which hostnames may solve the widget is enforced by Cloudflare from the
     * widget's own hostname list, so it is deliberately not re-checked here —
     * a second copy of that list only drifts and 403s in production.
     *
     * Fails closed — a siteverify outage rejects rather than letting bots through.
     */
    async verify(
        token?: string,
        action?: ENUM_TURNSTILE_ACTION
    ): Promise<void> {
        if (!this.secretKey) {
            return;
        }

        if (!token) {
            throw this.botDetected();
        }

        let body: ITurnstileSiteverifyResponse;
        try {
            const response = await fetch(this.verifyUrl, {
                method: 'POST',
                body: new URLSearchParams({
                    secret: this.secretKey,
                    response: token,
                }),
            });
            body = (await response.json()) as ITurnstileSiteverifyResponse;
        } catch (err: any) {
            this.logger.error(`Turnstile verify failed: ${err.message}`);
            throw this.botDetected();
        }

        if (body?.success !== true) {
            throw this.rejected(
                `siteverify: ${body?.['error-codes']?.join(', ') ?? 'unknown'}`
            );
        }

        // Cloudflare's testing keys echo no `action`, so enforcing it would
        // reject every local request. Cloudflare flags those responses;
        // `success` still applies.
        if (body.metadata?.result_with_testing_key) {
            return;
        }

        // A token solved on the cheap waitlist form must not unlock login.
        if (action && body.action !== action) {
            throw this.rejected(
                `action mismatch: expected ${action}, got ${body.action ?? 'none'}`
            );
        }
    }

    private rejected(reason: string): ForbiddenException {
        this.logger.warn(`Turnstile rejected — ${reason}`);
        return this.botDetected();
    }

    private botDetected(): ForbiddenException {
        return new ForbiddenException({
            statusCode: ENUM_TURNSTILE_STATUS_CODE_ERROR.BOT_DETECTED,
            message: 'turnstile.error.botDetected',
        });
    }
}
