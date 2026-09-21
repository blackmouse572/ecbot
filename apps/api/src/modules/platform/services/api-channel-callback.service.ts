import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { isApiChannelAccount } from '@app/modules/account/interfaces/account-config.interface';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
    API_CHANNEL_CALLBACK_TIMEOUT_MS,
    API_CHANNEL_SIGNATURE_HEADER,
    API_CHANNEL_TIMESTAMP_HEADER,
} from '../constants/api-channel-callback.constant';
import { ENUM_API_CHANNEL_STATUS_CODE_ERROR } from '../enums/api-channel.status-code.enum';

/** What a third party receives on its callback URL. */
export interface ApiChannelCallbackPayload {
    accountKey: string;
    senderId: string;
    externalId: string;
    text: string;
    timestamp: string;
}

/**
 * Signs and POSTs an API-channel bot reply to the third party's callback URL.
 *
 * Shared by the adapter (first attempt, inline) and the retry processor, so the
 * signature is computed in exactly one place — a second implementation would
 * silently break every receiver that verifies it.
 */
@Injectable()
export class ApiChannelCallbackService {
    constructor(
        private readonly accountService: AccountService,
        private readonly httpService: HttpService
    ) {}

    /**
     * Timestamp is signed with the body so a captured request can't be replayed
     * later — receivers should reject a stale timestamp as well as a bad hash.
     */
    signaturePayload(timestamp: string, body: unknown): string {
        return `${timestamp}.${JSON.stringify(body)}`;
    }

    sign(secret: string, payload: string): string {
        return createHmac('sha256', secret).update(payload).digest('hex');
    }

    async deliver(
        account: AccountEntity,
        payload: ApiChannelCallbackPayload
    ): Promise<void> {
        if (!isApiChannelAccount(account) || !account.config.callbackUrl) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_API_CHANNEL_STATUS_CODE_ERROR.CALLBACK_URL_MISSING,
                message: 'account.error.apiChannelCallbackUrlMissing',
            });
        }

        const secret = this.accountService.decryptToken(
            account.config.signingSecret
        );
        const signature = this.sign(
            secret,
            this.signaturePayload(payload.timestamp, payload)
        );

        await this.httpService.axiosRef.post(
            account.config.callbackUrl,
            payload,
            {
                timeout: API_CHANNEL_CALLBACK_TIMEOUT_MS,
                headers: {
                    'content-type': 'application/json',
                    [API_CHANNEL_SIGNATURE_HEADER]: signature,
                    [API_CHANNEL_TIMESTAMP_HEADER]: payload.timestamp,
                },
            }
        );
    }
}
