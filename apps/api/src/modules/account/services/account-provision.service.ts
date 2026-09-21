import { HelperEncryptionService } from '@app/common/helper/services/helper.encryption.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import slugify from 'slugify';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../enums/account.enum';
import {
    ApiChannelConfig,
    WebsiteWidgetConfig,
    WidgetTheme,
} from '../interfaces/account-config.interface';
import { AccountEntity } from '../repository/entities/account.entity';
import { AccountRepository } from '../repository/repositories/account.repository';
import { ENUM_ACCOUNT_STATUS_CODE_ERROR } from '../enums/account.status-code.enum';

export interface ProvisionApiChannelInput {
    workspaceId: string;
    name: string;
    callbackUrl: string;
    actionBy: string;
}

export interface ProvisionApiChannelResult {
    account: AccountEntity;
    accountKey: string;
    /** Plaintext, returned once — only the encrypted copy is persisted. */
    signingSecret: string;
}

export interface ProvisionWebsiteWidgetInput {
    workspaceId: string;
    name: string;
    allowedOrigins: string[];
    theme?: WidgetTheme;
    actionBy: string;
}

export interface ProvisionWebsiteWidgetResult {
    account: AccountEntity;
    /** Public identifier — it ships in the embed snippet, so it is not a secret. */
    widgetKey: string;
}

const SIGNING_SECRET_LENGTH = 48;

/**
 * Creates the two eccho-issued channel accounts.
 *
 * Deliberately separate from `AccountService.syncAccount`: that path is a
 * relying-party flow — exchange a third party's `code` for their token and
 * profile. Here eccho is the issuer, so there is no code to exchange and no
 * profile to fetch, and bending these through `IOAuthPlatformService` would mean
 * a required-but-meaningless `code` argument (the wart Telegram already carries).
 */
@Injectable()
export class AccountProvisionService {
    constructor(
        private readonly em: EntityManager,
        private readonly accountRepository: AccountRepository,
        private readonly helperStringService: HelperStringService,
        private readonly helperEncryption: HelperEncryptionService
    ) {}

    async provisionApiChannel(
        input: ProvisionApiChannelInput
    ): Promise<ProvisionApiChannelResult> {
        const accountKey = randomUUID();
        const signingSecret = this.helperStringService.random(
            SIGNING_SECRET_LENGTH
        );

        const config: ApiChannelConfig = {
            callbackUrl: input.callbackUrl,
            signingSecret: this.helperEncryption.envelopeEncrypt(signingSecret),
        };

        const account = await this.createChannelAccount(
            ENUM_ACCOUNT_TYPE.API_CHANNEL,
            accountKey,
            input.workspaceId,
            input.name,
            config,
            input.actionBy
        );

        return { account, accountKey, signingSecret };
    }

    async rotateApiChannelSecret(
        account: AccountEntity,
        actionBy: string
    ): Promise<ProvisionApiChannelResult> {
        if (account.type !== ENUM_ACCOUNT_TYPE.API_CHANNEL) {
            throw new BadRequestException({
                statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_AN_API_CHANNEL,
                message: 'account.error.notAnApiChannel',
            });
        }

        const signingSecret = this.helperStringService.random(
            SIGNING_SECRET_LENGTH
        );
        // Keep externalId and callbackUrl — rotating swaps the shared secret
        // only, so the third party re-points nothing but its verification key.
        account.config = {
            ...(account.config as ApiChannelConfig),
            signingSecret: this.helperEncryption.envelopeEncrypt(signingSecret),
        };

        await this.accountRepository.save(account, { actionBy });

        return { account, accountKey: account.externalId, signingSecret };
    }

    async updateCallbackUrl(
        account: AccountEntity,
        callbackUrl: string,
        actionBy: string
    ): Promise<AccountEntity> {
        if (account.type !== ENUM_ACCOUNT_TYPE.API_CHANNEL) {
            throw new BadRequestException({
                statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_AN_API_CHANNEL,
                message: 'account.error.notAnApiChannel',
            });
        }

        // Keep externalId and signingSecret — only where replies get POSTed changes.
        account.config = {
            ...(account.config as ApiChannelConfig),
            callbackUrl,
        };

        await this.accountRepository.save(account, { actionBy });

        return account;
    }

    async updateAllowedOrigins(
        account: AccountEntity,
        allowedOrigins: string[],
        actionBy: string
    ): Promise<AccountEntity> {
        if (account.type !== ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET) {
            throw new BadRequestException({
                statusCode:
                    ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_A_WEBSITE_WIDGET,
                message: 'account.error.notAWebsiteWidget',
            });
        }

        account.config = {
            ...(account.config as WebsiteWidgetConfig),
            allowedOrigins: normaliseOrigins(allowedOrigins),
        };

        await this.accountRepository.save(account, { actionBy });

        return account;
    }

    async provisionWebsiteWidget(
        input: ProvisionWebsiteWidgetInput
    ): Promise<ProvisionWebsiteWidgetResult> {
        const widgetKey = randomUUID();

        const config: WebsiteWidgetConfig = {
            allowedOrigins: normaliseOrigins(input.allowedOrigins),
            theme: input.theme,
        };

        const account = await this.createChannelAccount(
            ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            widgetKey,
            input.workspaceId,
            input.name,
            config,
            input.actionBy
        );

        return { account, widgetKey };
    }

    private async createChannelAccount(
        type: ENUM_ACCOUNT_TYPE,
        externalId: string,
        workspaceId: string,
        name: string,
        config: ApiChannelConfig | WebsiteWidgetConfig,
        actionBy: string
    ): Promise<AccountEntity> {
        return this.accountRepository.create<Partial<AccountEntity>>(
            {
                workspace: this.em.getReference(WorkspaceEntity, workspaceId),
                externalId,
                name,
                slug: slugify(`${name}-${externalId}`, { lower: true }),
                type,
                status: ENUM_ACCOUNT_STATUS.ACTIVE,
                config,
                // `accessToken` is NOT NULL and carries an OAuth token for every
                // other channel. These channels have none; the column is filled
                // with an unused random value rather than being given a second
                // meaning here.
                accessToken: this.helperEncryption.envelopeEncrypt(
                    randomUUID()
                ),
            },
            { actionBy }
        );
    }
}

/**
 * Reduce each entry to a bare origin so allowlist comparison is a plain string
 * match against a browser-supplied `Origin`/referrer origin — no path, no case
 * differences, no trailing slash.
 */
function normaliseOrigins(origins: string[]): string[] {
    const seen = new Set<string>();
    for (const raw of origins) {
        const trimmed = raw?.trim();
        if (!trimmed) continue;
        try {
            seen.add(new URL(trimmed).origin.toLowerCase());
        } catch {
            throw new BadRequestException({
                statusCode:
                    ENUM_ACCOUNT_STATUS_CODE_ERROR.INVALID_ALLOWED_ORIGIN,
                message: 'account.error.invalidAllowedOrigin',
            });
        }
    }
    return [...seen];
}
