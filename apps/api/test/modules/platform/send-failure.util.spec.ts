import {
    HttpException,
    HttpStatus,
    UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError, AxiosHeaders } from 'axios';
import { ENUM_SEND_FAILURE } from '@app/modules/platform/constants/channel-health.constant';
import { classifySendError } from '@app/modules/platform/utils/send-failure.util';

// The shape PlatformAdapter.rethrowPlatformError throws.
const upstream = (status: number, platformError: unknown) =>
    new HttpException(
        {
            statusCode: HttpStatus.BAD_GATEWAY,
            message: `x failed (HTTP ${status})`,
            upstreamStatus: status,
            platformError,
        },
        HttpStatus.BAD_GATEWAY
    );

const axiosError = (code?: string, status?: number, data?: unknown) => {
    const err = new AxiosError('boom', code);
    if (status) {
        err.response = {
            status,
            data,
            statusText: '',
            headers: {},
            config: { headers: new AxiosHeaders() },
        };
    }
    return err;
};

const zalo = (error: number) =>
    new UnprocessableEntityException({
        message: 'platform.error.sendFailed',
        statusCode: 422,
        errors: { provider: 'zalo', error, detail: 'x' },
    });

describe('classifySendError', () => {
    it.each([
        ['Meta token invalid (190)', upstream(400, { error: { code: 190 } })],
        ['plain 401', upstream(401, {})],
        ['Telegram bad token', axiosError(undefined, 401, { ok: false })],
        ['Zalo invalid token', zalo(-216)],
        ['Zalo expired token', zalo(-124)],
    ])('%s is an auth failure', (_, err) => {
        expect(classifySendError(err)).toBe(ENUM_SEND_FAILURE.AUTH);
    });

    it.each([
        ['5xx', upstream(503, {})],
        ['429', upstream(429, {})],
        ['Meta rate limit (code 4)', upstream(400, { error: { code: 4 } })],
        ['Meta temporary (code 2)', upstream(500, { error: { code: 2 } })],
        ['connection refused', axiosError('ECONNREFUSED')],
        ['DNS failure', axiosError('ENOTFOUND')],
    ])('%s is transient (safe to retry)', (_, err) => {
        expect(classifySendError(err)).toBe(ENUM_SEND_FAILURE.TRANSIENT);
    });

    it.each([
        ['Meta outside 24h window', upstream(400, { error: { code: 10 } })],
        ['Meta user unavailable', upstream(400, { error: { code: 551 } })],
        ['WhatsApp re-engagement', upstream(400, { error: { code: 131047 } })],
        [
            'Telegram bot blocked by user',
            axiosError(undefined, 403, { ok: false }),
        ],
        ['Zalo user not following', zalo(-213)],
        ['Zalo no interaction in 7 days', zalo(-230)],
        [
            'empty message',
            new UnprocessableEntityException({
                message: 'platform.error.emptyMessage',
            }),
        ],
    ])('%s is about one recipient, not the channel', (_, err) => {
        expect(classifySendError(err)).toBe(ENUM_SEND_FAILURE.RECIPIENT);
    });

    it.each([
        // The request may have reached the platform: retrying could double it.
        ['timeout', axiosError('ECONNABORTED')],
        ['connection reset', axiosError('ECONNRESET')],
        ['other 4xx', upstream(400, { error: { code: 100 } })],
        // Only Telegram's 403 means one customer blocked the bot.
        ['Meta 403 permission lost', upstream(403, { error: {} })],
        ['plain error', new Error('boom')],
    ])('%s is a failure that is not retried', (_, err) => {
        expect(classifySendError(err)).toBe(ENUM_SEND_FAILURE.OTHER);
    });
});
