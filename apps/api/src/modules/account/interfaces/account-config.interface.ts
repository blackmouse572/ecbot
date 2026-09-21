import { AccountEntity } from '../repository/entities/account.entity';
import { ENUM_ACCOUNT_TYPE } from '../enums/account.enum';

/**
 * Per-account channel settings, stored in the `accounts.config` jsonb column.
 *
 * Only the two eccho-issued channels use it — every OAuth platform keeps its
 * state in `accessToken`/`externalId`. The shape is discriminated by
 * `account.type`, narrowed through the guards below; nothing reads `config`
 * polymorphically, so there is no schema registry. Validation happens where
 * the value is written, in the provision/update DTOs.
 */

export interface ApiChannelConfig {
    /** Where bot replies are POSTed. */
    callbackUrl: string;
    /** HMAC key the third party verifies `x-eccho-signature` with. Envelope-encrypted at rest. */
    signingSecret: string;
}

export interface WidgetTheme {
    primaryColor?: string;
    launcherText?: string;
}

export interface WebsiteWidgetConfig {
    /** Origins allowed to embed the widget, e.g. `https://shop.example.com`. */
    allowedOrigins: string[];
    theme?: WidgetTheme;
}

export type AccountConfig = ApiChannelConfig | WebsiteWidgetConfig;

export function isApiChannelAccount(
    account: AccountEntity
): account is AccountEntity & { config: ApiChannelConfig } {
    return (
        account.type === ENUM_ACCOUNT_TYPE.API_CHANNEL && !!account.config
    );
}

export function isWebsiteWidgetAccount(
    account: AccountEntity
): account is AccountEntity & { config: WebsiteWidgetConfig } {
    return (
        account.type === ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET && !!account.config
    );
}
