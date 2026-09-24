import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsNumberString,
    IsOptional,
    IsString,
    IsUrl,
    Min,
    MinLength,
} from 'class-validator';
import {
    ENUM_APP_ENVIRONMENT,
    ENUM_APP_TIMEZONE,
} from 'src/app/enums/app.enum';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { ENUM_EMAIL_PROVIDERS } from '../enums/email-providers.enum';

export class AppEnvDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    APP_NAME: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @IsEnum(ENUM_APP_ENVIRONMENT)
    APP_ENV: ENUM_APP_ENVIRONMENT;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_MESSAGE_LANGUAGE)
    APP_LANGUAGE: ENUM_MESSAGE_LANGUAGE;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_TIMEZONE)
    APP_TIMEZONE: ENUM_APP_TIMEZONE;

    @IsNotEmpty()
    @IsString()
    HOME_NAME: string;

    @IsNotEmpty()
    @IsUrl({ require_tld: false })
    @IsString()
    HOME_URL: string;

    // Public origin of this API (webhook URLs), not HOME_URL/AI_BACKEND_URL
    @IsNotEmpty()
    @IsUrl({ require_tld: false })
    @IsString()
    API_BACKEND_URL: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    HTTP_HOST: string;

    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    @Type(() => Number)
    HTTP_PORT: number;

    // Reverse-proxy hops trusted for req.ip (Express `trust proxy`). Default: 1.
    @IsOptional()
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @Min(0)
    @Type(() => Number)
    APP_TRUST_PROXY_HOPS?: number;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DEBUG_ENABLE: boolean;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    DEBUG_LEVEL: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DEBUG_INTO_FILE: boolean;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DEBUG_PRETTIER: boolean;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    MIDDLEWARE_CORS_ORIGIN: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    URL_VERSIONING_ENABLE: boolean;

    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @Min(1)
    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    URL_VERSION: number;

    // Default: postgresql://postgres:password@localhost:5432/eccho
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    DATABASE_URL: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DATABASE_DEBUG: boolean;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    DATABASE_SSL?: boolean;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_AUDIENCE: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_ISSUER: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_JWKS_URI: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_KID: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY_PATH: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY_PATH: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_EXPIRED: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_KID: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY_PATH: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY_PATH: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_EXPIRED: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_CREDENTIAL_SECRET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_REGION?: string;

    // Default: 'bucketPublic'
    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_BUCKET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_CDN?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_ENDPOINT?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_CREDENTIAL_SECRET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_REGION?: string;

    // Default: 'bucketPrivate'
    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_BUCKET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_ENDPOINT?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_CDN?: string;

    @IsOptional()
    @IsString()
    AWS_SES_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_SES_CREDENTIAL_SECRET?: string;

    @IsOptional()
    @IsString()
    AWS_SES_REGION?: string;

    @IsOptional()
    @IsString()
    AWS_PINPOINT_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_PINPOINT_CREDENTIAL_SECRET?: string;

    @IsOptional()
    @IsString()
    AWS_PINPOINT_REGION?: string;

    @IsOptional()
    @IsString()
    AWS_PINPOINT_APPLICATION_ID?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_ID?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_SECRET?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_APPLE_CLIENT_ID?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID?: string;

    @IsNotEmpty()
    @IsString()
    REDIS_HOST: string;

    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    @Type(() => Number)
    REDIS_PORT: number;

    @IsOptional()
    @IsString()
    REDIS_USERNAME?: string;

    @IsOptional()
    @IsString()
    REDIS_PASSWORD?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    REDIS_TLS?: boolean;

    @IsOptional()
    @IsString()
    SENTRY_DSN?: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_EMAIL_PROVIDERS)
    EMAIL_PROVIDER: ENUM_EMAIL_PROVIDERS;

    @IsString()
    @IsOptional()
    RESEND_API_KEY: string;

    @IsOptional()
    @IsString()
    EMAIL_FROM?: string;

    // Workspace invitation tokens
    @IsOptional()
    @IsString()
    WORK_SPACE_INVITATION_TOKEN_SECRET_KEY?: string;

    @IsOptional()
    @IsString()
    WORK_SPACE_INVITATION_TOKEN_EXPIRED?: string;

    // Facebook Messenger platform integration
    @IsOptional()
    @IsString()
    FACEBOOK_APP_ID?: string;

    @IsOptional()
    @IsString()
    FACEBOOK_APP_SECRET?: string;

    @IsOptional()
    @IsString()
    FACEBOOK_WEBHOOK_SECRET?: string;

    // Default: 'v16.0'
    @IsOptional()
    @IsString()
    FACEBOOK_GRAPH_API_VERSION?: string;

    @IsOptional()
    @IsString()
    FACEBOOK_REDIRECT_URI?: string;

    @IsOptional()
    @IsString()
    FACEBOOK_CALLBACK_URL?: string;

    @IsOptional()
    @IsString()
    FACEBOOK_PAGE_ACCESS_TOKEN?: string;

    // OAuth token encryption (required for all platform account connections)
    @IsNotEmpty()
    @IsString()
    OAUTH_TOKEN_ENCRYPT_KEY: string;

    @IsOptional()
    @IsString()
    OAUTH_TOKEN_ENCRYPT_IV?: string;

    // Default: 'v1'
    @IsOptional()
    @IsString()
    OAUTH_TOKEN_ENCRYPT_DEFAULT_KEY_ID?: string;

    // Instagram platform OAuth
    @IsOptional()
    @IsString()
    INSTAGRAM_APP_ID?: string;

    @IsOptional()
    @IsString()
    INSTAGRAM_APP_SECRET?: string;

    @IsOptional()
    @IsString()
    INSTAGRAM_REDIRECT_URI?: string;

    // Zalo OA platform OAuth
    @IsOptional()
    @IsString()
    ZALO_APP_ID?: string;

    @IsOptional()
    @IsString()
    ZALO_APP_SECRET?: string;

    @IsOptional()
    @IsString()
    ZALO_REDIRECT_URI?: string;

    // TikTok Shop platform OAuth
    @IsOptional()
    @IsString()
    TIKTOK_APP_KEY?: string;

    @IsOptional()
    @IsString()
    TIKTOK_APP_SECRET?: string;

    @IsOptional()
    @IsString()
    TIKTOK_REDIRECT_URI?: string;

    // Shopee platform OAuth
    @IsOptional()
    @IsString()
    SHOPEE_PARTNER_ID?: string;

    @IsOptional()
    @IsString()
    SHOPEE_PARTNER_KEY?: string;

    @IsOptional()
    @IsString()
    SHOPEE_REDIRECT_URI?: string;

    // Telegram platform integration
    @IsOptional()
    @IsString()
    TELEGRAM_WEBHOOK_SECRET_TOKEN?: string;

    // Default: 'https://api.telegram.org'
    @IsOptional()
    @IsString()
    TELEGRAM_API_URL?: string;

    // apps/ai service origin (not API_BACKEND_URL/HOME_URL)
    // Default: 'http://localhost:8000'
    @IsOptional()
    @IsString()
    AI_BACKEND_URL?: string;

    // Local dev tunnel (e.g. for platform webhook callbacks)
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    LOCAL_TUNNEL_ENABLE?: boolean;

    @IsOptional()
    @IsString()
    LOCAL_TUNNEL_SUBDOMAIN?: string;

    // Composio Tool Registry marketplace
    @IsOptional()
    @IsString()
    COMPOSIO_API_KEY?: string;

    // Default: 'https://backend.composio.dev'
    @IsOptional()
    @IsString()
    COMPOSIO_BASE_URL?: string;

    // Tool egress guard (SSRF defense) — src/common/helper/services/helper.egress.service.ts
    // Default: 5000000 (5 MB)
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    TOOL_EGRESS_MAX_RESPONSE_BYTES?: number;

    // BullMQ worker concurrency overrides
    // Default: 4
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    WORKER_CONCURRENCY_INBOUND?: number;

    // E2E testing only — never set in production or staging
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    E2E_TEST_HELPERS?: boolean;

    @IsOptional()
    @IsString()
    E2E_TEST_KEY?: string;

    // Google Cloud Tasks (BullMQ processor migration)
    @IsOptional()
    @IsString()
    CLOUD_TASKS_PROJECT_ID?: string;

    // Default: 'asia-southeast1'
    @IsOptional()
    @IsString()
    CLOUD_TASKS_LOCATION?: string;

    @IsOptional()
    @IsString()
    CLOUD_TASKS_SYSTEM_API_KEY?: string;

    @IsOptional()
    @IsString()
    CLOUD_TASKS_EMULATOR_HOST?: string;

    // Cloudflare Turnstile (login/sign-up/waitlist captcha)
    @IsOptional()
    @IsString()
    TURNSTILE_SECRET_KEY?: string;

    // Chatbot preview share links (issue #80)
    @IsOptional()
    @IsString()
    CHATBOT_PREVIEW_SHARE_TOKEN_SECRET_KEY?: string;

    // POC: edge debounce (Cloudflare Durable Object) integration
    @IsOptional()
    @IsString()
    POC_EDGE_DEBOUNCE_URL?: string;

    @IsOptional()
    @IsString()
    POC_EDGE_INTERNAL_SECRET?: string;

    // Billing: plan catalog sync + token quota defaults (issues #78/#79)
    // Comma-separated ENUM_PAYMENT_PROVIDER values. Empty keeps plans local.
    @IsOptional()
    @IsString()
    BILLING_SYNC_PROVIDERS?: string;

    @IsOptional()
    @IsString()
    STRIPE_SECRET_KEY?: string;

    @IsOptional()
    @IsNumberString()
    BILLING_FREE_PLAN_TOKEN_QUOTA?: string;

    @IsOptional()
    @IsNumberString()
    BILLING_LOW_BALANCE_THRESHOLD?: string;
}
