import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import {
    HttpException,
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

interface WhatsAppPhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
}

/** Graph `/oauth/access_token` response; `expires_in` only for expiring tokens. */
interface GraphToken {
    access_token: string;
    expires_in?: number;
}

/** Graph `/debug_token`: which assets each permission was granted on. */
interface DebugToken {
    data: { granular_scopes?: { scope: string; target_ids?: string[] }[] };
}

const GRAPH_API_BASE = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v21.0';

/**
 * Links WhatsApp Cloud API numbers. The single `code` string carries one of:
 *  - Embedded Signup (the main flow): the OAuth code from Meta's signup,
 *    opened as a plain facebook.com popup — not the JS SDK, which ad-blockers
 *    stop. That redirect carries no asset IDs, so the WABA is found through
 *    debug_token and every one of its numbers is linked.
 *  - Manual credential (the "advanced" fallback):
 *    `"<phoneNumberId>:<accessToken>"` — OAuth codes and Meta tokens contain
 *    no `:`, which tells the two apart.
 *
 * The Meta app's WhatsApp webhook is configured once in the app dashboard and
 * points at `/api/v1/public/webhooks/whatsapp`.
 */
@Injectable()
export class WhatsAppOAuthService implements IOAuthPlatformService {
    private readonly logger = new Logger(WhatsAppOAuthService.name);
    private readonly graphUrl: string;
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;

    constructor(
        config: ConfigService,
        private readonly http: HttpService
    ) {
        const version =
            config.get<string>('facebook.graphApiVersion') ??
            DEFAULT_API_VERSION;
        this.graphUrl = `${GRAPH_API_BASE}/${version}`;
        this.appId = config.get<string>('facebook.appId');
        this.appSecret = config.get<string>('facebook.appSecret');
        // Same callback page as the Facebook link flow; the exchange must match it.
        this.redirectUri = config.get<string>('facebook.redirectUri');
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        const separator = code.indexOf(':');
        if (separator < 0) return this.completeSignup(code);

        const phoneNumberId = code.slice(0, separator);
        const accessToken = code.slice(separator + 1);
        if (!/^\d+$/.test(phoneNumberId) || !accessToken) {
            throw this.invalid('whatsapp.error.invalidCredential');
        }
        const profile = await this.profile(phoneNumberId, accessToken);
        await this.subscribeOwningWaba(phoneNumberId, accessToken);
        return profile;
    }

    // Only Embedded Signup tokens carry an expiry (the 60-day system-user
    // token), so AccountTokenRefreshScheduler reaches this for them alone;
    // manual tokens are never selected. A throw makes the scheduler block the
    // account and ask the owner to reconnect.
    async refreshCredentials(accessToken: string): Promise<IOAuthTokenResult> {
        const res = await this.http.axiosRef.get<GraphToken>(
            `${this.graphUrl}/oauth/access_token`,
            {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    set_token_expires_in_60_days: true,
                    fb_exchange_token: accessToken,
                },
            }
        );
        return { ...this.toToken(res.data), externalId: '', name: '' };
    }

    // ----- Embedded Signup -----

    private async completeSignup(code: string): Promise<IOAuthTokenResult> {
        const token = await this.exchangeCode(code);
        let numbers: WhatsAppPhoneNumber[];
        try {
            // Meta lists the most recently onboarded WABA first — the one this
            // signup just shared.
            const [wabaId] = await this.wabaIds(token.accessToken);
            if (!wabaId) throw this.invalid('whatsapp.error.signupFailed');
            // Without the subscription Meta sends no webhooks for this WABA,
            // so a failure here must fail the link rather than leave a silent
            // account.
            await this.post(`${wabaId}/subscribed_apps`, token.accessToken);
            numbers = await this.phoneNumbers(wabaId, token.accessToken);
        } catch (err) {
            this.graphFailed(err, 'whatsapp.error.signupFailed');
        }

        if (!numbers.length) throw this.invalid('whatsapp.error.noPhoneNumber');
        for (const number of numbers) {
            await this.registerNumber(number.id, token.accessToken);
        }

        const [first, ...rest] = numbers.map(number => ({
            ...token,
            ...this.toProfile(number),
        }));
        return rest.length ? { ...first, additionalAccounts: rest } : first;
    }

    /** The code is short-lived (30 seconds), so this runs first. */
    private async exchangeCode(
        code: string
    ): Promise<Pick<IOAuthTokenResult, 'accessToken' | 'tokenExpiresAt'>> {
        try {
            const res = await this.http.axiosRef.get<GraphToken>(
                `${this.graphUrl}/oauth/access_token`,
                {
                    params: {
                        client_id: this.appId,
                        client_secret: this.appSecret,
                        redirect_uri: this.redirectUri,
                        code,
                    },
                }
            );
            return this.toToken(res.data);
        } catch (err) {
            this.graphFailed(err, 'whatsapp.error.signupFailed');
        }
    }

    // ----- Manual credential -----

    // Meta only delivers a WABA's messages to apps subscribed to it — the
    // dashboard webhook alone is not enough. A token may reach several WABAs,
    // so subscribe the one that actually holds this number.
    private async subscribeOwningWaba(
        phoneNumberId: string,
        accessToken: string
    ): Promise<void> {
        try {
            for (const wabaId of await this.wabaIds(accessToken)) {
                const numbers = await this.phoneNumbers(wabaId, accessToken);
                if (numbers.some(number => number.id === phoneNumberId)) {
                    await this.post(`${wabaId}/subscribed_apps`, accessToken);
                    return;
                }
            }
        } catch (err) {
            this.graphFailed(err, 'whatsapp.error.wabaAccess');
        }
        throw this.invalid('whatsapp.error.wabaAccess');
    }

    // ----- WABA lookups (callers map failures to their own message) -----

    /** WABAs the token may manage, newest onboarded first. */
    private async wabaIds(accessToken: string): Promise<string[]> {
        const res = await this.http.axiosRef.get<DebugToken>(
            `${this.graphUrl}/debug_token`,
            {
                params: {
                    input_token: accessToken,
                    access_token: `${this.appId}|${this.appSecret}`,
                },
            }
        );
        return (
            res.data.data.granular_scopes?.find(
                s => s.scope === 'whatsapp_business_management'
            )?.target_ids ?? []
        );
    }

    private async phoneNumbers(
        wabaId: string,
        accessToken: string
    ): Promise<WhatsAppPhoneNumber[]> {
        const res = await this.http.axiosRef.get<{
            data: WhatsAppPhoneNumber[];
        }>(`${this.graphUrl}/${wabaId}/phone_numbers`, {
            params: { fields: 'id,display_phone_number,verified_name' },
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return res.data.data ?? [];
    }

    // Cloud API requires registering a newly added number. The two-step PIN is
    // generated and discarded; the owner can reset it in WhatsApp Manager.
    // Best-effort: a number already on Cloud API keeps its own PIN and rejects
    // this, yet still works.
    private async registerNumber(
        phoneNumberId: string,
        accessToken: string
    ): Promise<void> {
        const pin = randomInt(0, 1_000_000).toString().padStart(6, '0');
        try {
            await this.post(`${phoneNumberId}/register`, accessToken, {
                messaging_product: 'whatsapp',
                pin,
            });
        } catch (err) {
            this.logger.warn(
                `WHATSAPP: register failed for ${phoneNumberId} (already registered?): ${
                    err?.response?.data?.error?.message ?? err?.message ?? err
                }`
            );
        }
    }

    /** A Graph refusal becomes `message` (422); a network failure a retryable 503. */
    private graphFailed(err: unknown, message: string): never {
        if (err instanceof HttpException) throw err;
        this.logger.warn(
            `WHATSAPP: ${message}: ${
                (err as any)?.response?.data?.error?.message ??
                (err as Error)?.message ??
                err
            }`
        );
        if ((err as any)?.response) throw this.invalid(message);
        throw new ServiceUnavailableException({
            message: 'whatsapp.error.unreachable',
        });
    }

    // ----- shared -----

    private async profile(
        phoneNumberId: string,
        accessToken: string
    ): Promise<IOAuthTokenResult> {
        const phone = await this.getPhoneNumber(phoneNumberId, accessToken);
        return { accessToken, ...this.toProfile(phone) };
    }

    private toProfile(phone: WhatsAppPhoneNumber) {
        return {
            externalId: phone.id,
            name: phone.verified_name,
            link: `https://wa.me/${phone.display_phone_number.replace(/\D/g, '')}`,
        };
    }

    private async getPhoneNumber(
        phoneNumberId: string,
        accessToken: string
    ): Promise<WhatsAppPhoneNumber> {
        try {
            const res = await this.http.axiosRef.get<WhatsAppPhoneNumber>(
                `${this.graphUrl}/${phoneNumberId}`,
                {
                    params: { fields: 'id,display_phone_number,verified_name' },
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            return res.data;
        } catch (err) {
            const status = err?.response?.status;
            if (status >= 400 && status < 500) {
                throw this.invalid('whatsapp.error.invalidCredential');
            }
            // Network failure or Graph 5xx — retryable.
            throw new ServiceUnavailableException({
                message: 'whatsapp.error.unreachable',
            });
        }
    }

    private post(
        endpoint: string,
        accessToken: string,
        body: Record<string, unknown> = {}
    ) {
        return this.http.axiosRef.post(`${this.graphUrl}/${endpoint}`, body, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }

    /** A configuration set to "never expire" returns no `expires_in`. */
    private toToken({ access_token, expires_in }: GraphToken) {
        return {
            accessToken: access_token,
            tokenExpiresAt: expires_in
                ? new Date(Date.now() + expires_in * 1000)
                : undefined,
        };
    }

    private invalid(message: string): UnprocessableEntityException {
        return new UnprocessableEntityException({ message });
    }
}
