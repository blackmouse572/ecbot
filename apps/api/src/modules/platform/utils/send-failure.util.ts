import { HttpException } from '@nestjs/common';
import { isAxiosError } from 'axios';
import {
    ENUM_SEND_FAILURE,
    META_AUTH_CODES,
    META_RECIPIENT_CODES,
    META_RECIPIENT_SUBCODES,
    META_TRANSIENT_CODES,
    NETWORK_TRANSIENT_CODES,
    ZALO_AUTH_CODES,
    ZALO_RECIPIENT_CODES,
} from '../constants/channel-health.constant';

interface IUpstream {
    status?: number;
    // Platform response bodies differ per provider.
    body?: any;
    networkCode?: string;
    zaloCode?: number;
    localKey?: string;
}

/** Pull the provider's answer out of whatever the adapter threw. */
function upstreamOf(err: unknown): IUpstream {
    if (isAxiosError(err)) {
        return {
            status: err.response?.status,
            body: err.response?.data,
            networkCode: err.response ? undefined : err.code,
        };
    }
    if (err instanceof HttpException) {
        const res = err.getResponse() as any;
        if (typeof res !== 'object' || !res) return {};
        if (res.errors?.provider === 'zalo') {
            return { zaloCode: Number(res.errors.error) };
        }
        return {
            status: res.upstreamStatus,
            body: res.platformError,
            localKey:
                res.upstreamStatus === undefined ? res.message : undefined,
        };
    }
    return {};
}

/**
 * Sort a send failure by what it says about the channel: the token is gone,
 * the request never landed and can be resent, the failure is about this one
 * customer, or something else.
 */
export function classifySendError(err: unknown): ENUM_SEND_FAILURE {
    const { status, body, networkCode, zaloCode, localKey } = upstreamOf(err);

    if (zaloCode !== undefined) {
        if (ZALO_AUTH_CODES.has(zaloCode)) return ENUM_SEND_FAILURE.AUTH;
        if (ZALO_RECIPIENT_CODES.has(zaloCode))
            return ENUM_SEND_FAILURE.RECIPIENT;
        return ENUM_SEND_FAILURE.OTHER;
    }
    if (localKey === 'platform.error.emptyMessage') {
        return ENUM_SEND_FAILURE.RECIPIENT;
    }
    if (networkCode && NETWORK_TRANSIENT_CODES.has(networkCode)) {
        return ENUM_SEND_FAILURE.TRANSIENT;
    }

    const meta = body?.error;
    if (meta && typeof meta.code === 'number') {
        if (META_AUTH_CODES.has(meta.code)) return ENUM_SEND_FAILURE.AUTH;
        if (META_TRANSIENT_CODES.has(meta.code))
            return ENUM_SEND_FAILURE.TRANSIENT;
        if (
            META_RECIPIENT_CODES.has(meta.code) ||
            META_RECIPIENT_SUBCODES.has(meta.error_subcode)
        )
            return ENUM_SEND_FAILURE.RECIPIENT;
    }

    if (status === 401) return ENUM_SEND_FAILURE.AUTH;
    // Telegram ({ ok: false }): the customer blocked the bot. A 403 from
    // another platform is a lost permission, which is the channel's problem.
    if (status === 403 && body?.ok === false) {
        return ENUM_SEND_FAILURE.RECIPIENT;
    }
    if (status === 429 || (status !== undefined && status >= 500)) {
        return ENUM_SEND_FAILURE.TRANSIENT;
    }
    return ENUM_SEND_FAILURE.OTHER;
}

/** A short, log-safe line for the admin site and Sentry. */
export function describeSendError(err: unknown): string {
    if (err instanceof HttpException) {
        const errors = (err.getResponse() as any)?.errors;
        if (errors?.provider) {
            return `${errors.provider} error ${errors.error}: ${errors.detail}`;
        }
    }
    return err instanceof Error ? err.message : String(err);
}
