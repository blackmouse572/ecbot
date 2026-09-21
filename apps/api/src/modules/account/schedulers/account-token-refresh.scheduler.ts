import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { OAuthPlatformFactory } from '@app/common/oauth/oauth-platform.factory';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import {
    TokenEncryptionError,
    TokenEncryptionErrorReason,
} from 'src/common/helper/exceptions/token-encryption.exception';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { ENUM_ACCOUNT_STATUS } from '../enums/account.enum';
import { AccountRepository } from '../repository/repositories/account.repository';

// Only these two reasons are operator/deploy misconfigurations (a missing or
// wrong-length OAUTH_TOKEN_ENCRYPT_KEY) that apply to every row alike; the
// rest — invalid_format, unsupported_version, auth_failed — are per-row data
// faults, so they keep the BLOCKED + notify path.
const OPERATOR_FAULT_REASONS: ReadonlySet<TokenEncryptionErrorReason> = new Set(
    ['key_not_found', 'key_length']
);

@Injectable()
export class AccountTokenRefreshScheduler {
    private readonly logger = new Logger(AccountTokenRefreshScheduler.name);

    constructor(
        private readonly accountRepository: AccountRepository,
        private readonly oauthPlatformFactory: OAuthPlatformFactory,
        private readonly helperEncryption: HelperEncryptionService,
        private readonly orm: MikroORM,
        private readonly notificationService: NotificationService,
        private readonly cloudTasksClient: CloudTasksQueueClient
    ) {}

    private encryptToken(token: string): string {
        if (!token) return token;
        return this.helperEncryption.envelopeEncrypt(token);
    }

    private decryptToken(encryptedToken: string): string {
        if (!encryptedToken) return encryptedToken;
        return this.helperEncryption.envelopeDecrypt(encryptedToken);
    }

    // Notifies the workspace owner (in-app + email) that a connected account
    // was disconnected. Failures here are logged and swallowed — they must
    // never stop the refresh job from processing the remaining accounts.
    private async notifyOwnerOfBlockedAccount(account: {
        id: string;
        name: string;
        workspace: {
            slug: string;
            owner: { id: string; name: string; email: string };
        };
    }): Promise<void> {
        try {
            await this.orm.em.populate(account, ['workspace.owner']);
            const owner = account.workspace.owner;
            const reconnectUrl = `/${account.workspace.slug}/accounts/${account.id}`;

            await Promise.all([
                this.notificationService.createAccountBlocked(
                    owner.id,
                    { id: account.id, name: account.name },
                    reconnectUrl
                ),
                this.cloudTasksClient.enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED,
                    {
                        send: { email: owner.email, name: owner.name },
                        data: { accountName: account.name, reconnectUrl },
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED}-${account.id}`,
                    }
                ),
            ]);
        } catch (error: any) {
            this.logger.warn(
                `Failed to notify owner for blocked account ${account.id} (non-fatal): ${error.message}`
            );
        }
    }

    @ContextualCron(CronExpression.EVERY_HOUR)
    async handleTokenRefresh(): Promise<void> {
        this.logger.log('Running account token refresh job');

        const expiringAccounts =
            await this.accountRepository.findExpiringSoon(30);

        if (!expiringAccounts.length) {
            this.logger.log('No expiring tokens found');
            return;
        }

        this.logger.log(
            `Refreshing tokens for ${expiringAccounts.length} account(s)`
        );

        let refreshed = 0;
        let blocked = 0;
        let configFaults = 0;

        for (const account of expiringAccounts) {
            try {
                const decryptedAccessToken = this.decryptToken(
                    account.accessToken
                );
                const decryptedRefreshToken = this.decryptToken(
                    account.refreshToken
                );

                const platformService = this.oauthPlatformFactory.getService(
                    account.type
                );
                const result = await platformService.refreshCredentials(
                    decryptedAccessToken,
                    decryptedRefreshToken
                );

                account.accessToken = this.encryptToken(result.accessToken);
                account.refreshToken = result.refreshToken
                    ? this.encryptToken(result.refreshToken)
                    : account.refreshToken;
                account.tokenExpiresAt = result.tokenExpiresAt;
                account.status = ENUM_ACCOUNT_STATUS.ACTIVE;

                await this.accountRepository.save(account);
                refreshed++;
                this.logger.log(`Token refreshed for account ${account.id}`);
            } catch (error: any) {
                // A missing or wrong-length OAUTH_TOKEN_ENCRYPT_KEY is an
                // operator fault, not a dead connection: blocking every
                // account and emailing every owner would BE the outage. Every
                // other reason (invalid_format, unsupported_version,
                // auth_failed) is a per-row data fault - that row really is
                // undecryptable, so it keeps blocking and notifying.
                if (
                    error instanceof TokenEncryptionError &&
                    OPERATOR_FAULT_REASONS.has(error.reason)
                ) {
                    configFaults++;
                    this.logger.error(
                        `Token encryption configuration fault (${error.reason}) for account ${account.id}: ${error.message}`
                    );
                    continue;
                }

                this.logger.error(
                    `Failed to refresh token for account ${account.id}: ${error.message}`
                );
                account.status = ENUM_ACCOUNT_STATUS.BLOCKED;
                blocked++;
                await this.accountRepository.save(account);
                await this.notifyOwnerOfBlockedAccount(account as any);
            } finally {
                // Release ONLY the just-processed account from the identity map.
                // `em.clear()` would detach the whole batch, but the not-yet-
                // processed accounts are already managed (loaded up front by
                // findExpiringSoon), so the next save() would persist a detached
                // entity (INSERT → duplicate key / lost token update).
                this.orm.em.getUnitOfWork().unsetIdentity(account);
            }
        }

        this.logger.log(
            `Token refresh run: refreshed ${refreshed}, blocked ${blocked}, config faults ${configFaults}`
        );
    }
}
