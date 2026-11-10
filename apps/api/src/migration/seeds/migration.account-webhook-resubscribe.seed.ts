import {
    ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE,
    FACEBOOK_SUBSCRIPTION_FIELD,
} from '@app/common/enums/facebook.enum';
import { FacebookPageResponseDto } from '@app/common/facebook/dtos/facebook-page.response.dto';
import { FacebookWebhookService } from '@app/common/facebook/services/facebook-webhook.service';
import { HelperEncryptionService } from '@app/common/helper/services/helper.encryption.service';
import { InstagramOAuthService } from '@app/common/instagram/services/instagram-oauth.service';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';

export interface IAccountWebhookResubscribeCounts {
    subscribed: number;
    failed: number;
}

/**
 * A Page or Instagram account keeps the webhook fields it was subscribed with
 * when it was connected. Run this after adding a field (messaging_referrals for
 * tracked links) so accounts connected earlier get it too. Safe to repeat.
 */
@Injectable()
export class MigrationAccountWebhookResubscribeSeed {
    constructor(
        private readonly em: EntityManager,
        private readonly accountRepository: AccountRepository,
        private readonly helperEncryption: HelperEncryptionService,
        private readonly facebookWebhookService: FacebookWebhookService,
        private readonly instagramOAuthService: InstagramOAuthService
    ) {}

    async resubscribe(): Promise<IAccountWebhookResubscribeCounts> {
        const counts = { subscribed: 0, failed: 0 };
        const accounts = await this.accountRepository.find<AccountEntity>(
            {
                type: {
                    $in: [
                        ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                        ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
                    ],
                },
                status: ENUM_ACCOUNT_STATUS.ACTIVE,
                deletedAt: null,
            },
            { em: this.em.fork() }
        );

        for (const account of accounts) {
            const ok = await this.subscribe(account).catch(() => false);
            counts[ok ? 'subscribed' : 'failed']++;
        }

        return counts;
    }

    private async subscribe(account: AccountEntity): Promise<boolean> {
        const token = this.helperEncryption.envelopeDecrypt(
            account.accessToken
        );

        if (account.type === ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE) {
            await this.instagramOAuthService.subscribeWebhooks(token);

            return true;
        }

        // SAFETY: subscribePageWebhook reads only the Page id and its token.
        const page = {
            id: account.externalId,
            access_token: token,
        } as FacebookPageResponseDto;

        return this.facebookWebhookService.subscribePageWebhook(
            [page],
            FACEBOOK_SUBSCRIPTION_FIELD[ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE]
        );
    }

    @Command({
        command: 'account:resubscribe-webhooks',
        describe:
            'subscribe connected Facebook Pages and Instagram accounts to the current webhook fields',
    })
    async run(): Promise<void> {
        const { subscribed, failed } = await this.resubscribe();

        // stdout, not the Nest logger: cli.ts keeps the logger to errors only.
        process.stdout.write(
            `webhooks resubscribed: ${subscribed}, failed: ${failed}\n`
        );
    }
}
