import { randomUUID } from 'crypto';
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
import { ENUM_ACCOUNT_STATUS, ENUM_ACCOUNT_TYPE } from '../enums/account.enum';
import { AccountRepository } from '../repository/repositories/account.repository';

// Only these two reasons are operator/deploy misconfigurations (a missing or
// wrong-length OAUTH_TOKEN_ENCRYPT_KEY) that apply to every row alike; the
// rest — invalid_format, unsupported_version, auth_failed — are per-row data
// faults, so they keep the BLOCKED + notify path.
const REFRESH_AHEAD_MINUTES = 30;

// Instagram refuses to refresh an expired token, and this job runs hourly, so
// its 60-day tokens are refreshed a week ahead.
const EARLY_REFRESH = {
    types: [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE],
    minutes: 7 * 24 * 60,
};

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
        chatbot?: { primaryLanguage?: string } | null;
        workspace: {
            slug: string;
            owner: { id: string; name: string; email: string };
        };
    }): Promise<void> {
        try {
            // The chatbot's language, so the email reads like the shop's agent.
            await this.orm.em.populate(account, ['workspace.owner', 'chatbot']);
            const owner = account.workspace.owner;
            // The channels list: there is no per-account page to link to.
            const reconnectUrl = `/${account.workspace.slug}/accounts`;

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
                        data: {
                            accountName: account.name,
                            reconnectUrl,
                            language: account.chatbot?.primaryLanguage,
                        },
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED}-${account.id}-${randomUUID()}`,
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

        const expiringAccounts = await this.accountRepository.findExpiringSoon(
            REFRESH_AHEAD_MINUTES,
            EARLY_REFRESH
        );

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
        // Acted on after the loop, so the circuit breaker below can see the
        // whole run before any account is blocked or any owner emailed.
        const failed: {
            account: (typeof expiringAccounts)[number];
            error: any;
        }[] = [];

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

                // Picked up early, the current token still works: retry on a
                // later run instead of blocking a working account.
                const stillValid =
                    !!account.tokenExpiresAt &&
                    account.tokenExpiresAt.getTime() >
                        Date.now() + REFRESH_AHEAD_MINUTES * 60 * 1000;
                if (stillValid) {
                    this.logger.warn(
                        `Early token refresh failed for account ${account.id}, retrying next run: ${error.message}`
                    );
                    continue;
                }

                failed.push({ account, error });
            } finally {
                // Release ONLY the just-processed account from the identity map.
                // `em.clear()` would detach the whole batch, but the not-yet-
                // processed accounts are already managed (loaded up front by
                // findExpiringSoon), so the next save() would persist a detached
                // entity (INSERT → duplicate key / lost token update). A failed
                // account is saved after the loop, so it is released there.
                if (failed.at(-1)?.account !== account) {
                    this.orm.em.getUnitOfWork().unsetIdentity(account);
                }
            }
        }

        // Circuit breaker (#13): when nothing refreshed and every failure is a
        // decrypt failure, the key changed under us (e.g. the v1 key value
        // replaced in place), not every connection died at once. Blocking
        // every account and emailing every owner would be the outage, so
        // write nothing and let the next run retry. One account alone still
        // blocks, so a single corrupt row is never masked.
        const decryptFailures = failed.filter(
            f => f.error instanceof TokenEncryptionError
        );
        if (
            refreshed === 0 &&
            failed.length >= 2 &&
            decryptFailures.length === failed.length
        ) {
            const reasons = new Map<string, number>();
            for (const { error } of decryptFailures) {
                reasons.set(error.reason, (reasons.get(error.reason) ?? 0) + 1);
            }
            const histogram = [...reasons]
                .map(([reason, n]) => `${reason}: ${n}`)
                .join(', ');
            this.logger.error(
                `Token refresh aborted: ${decryptFailures.length}/${expiringAccounts.length} accounts failed to decrypt (${histogram}). Treating it as a key or config fault; no status written`
            );
            for (const { account } of failed) {
                this.orm.em.getUnitOfWork().unsetIdentity(account);
            }
            return;
        }

        for (const { account, error } of failed) {
            this.logger.error(
                `Failed to refresh token for account ${account.id}: ${error.message}`
            );
            account.status = ENUM_ACCOUNT_STATUS.BLOCKED;
            blocked++;
            try {
                await this.accountRepository.save(account);
                await this.notifyOwnerOfBlockedAccount(account as any);
            } finally {
                this.orm.em.getUnitOfWork().unsetIdentity(account);
            }
        }

        this.logger.log(
            `Token refresh run: refreshed ${refreshed}, blocked ${blocked}, config faults ${configFaults}`
        );
    }
}
