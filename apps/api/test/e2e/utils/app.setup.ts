import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import cookieParser from 'cookie-parser';
import { AppModule } from '@app/app/app.module';
import type { INestApplication } from '@nestjs/common';

export interface E2EContext {
    app: INestApplication;
    /** Base path incl. global prefix + version, e.g. "/api/v1". */
    base: string;
    close: () => Promise<void>;
}

// A no-op email provider — email is unavailable in tests, and the invitation
// token is already persisted + returned in the response before the send call,
// so stubbing the 'IEmailService' provider is all that is required to exercise
// the invite → join flow without any real mail transport.
const emailStub = {
    sendInvitationToWorkSpace: async () => true,
    sendWelcome: async () => true,
    sendCreate: async () => true,
    sendVerification: async () => true,
    sendEmailVerified: async () => true,
    sendChangePassword: async () => true,
    sendResetPassword: async () => true,
    sendTempPassword: async () => true,
    sendMobileNumberVerified: async () => true,
};

/**
 * Boots the real AppModule against the (dev) Postgres + Redis configured via env,
 * overriding only the email provider. Mirrors the global config in src/main.ts
 * (global prefix, URI versioning, cookie parser, class-validator container) so
 * routes resolve at the same paths as production.
 *
 * Prerequisites: Postgres + Redis reachable, and the DB seeded via
 *   pnpm --filter api migrate:up && pnpm --filter api migrate:seed:e2e
 */
export async function bootstrapE2E(): Promise<E2EContext> {
    // Deterministic invitation JWT config for tests. Set BEFORE the ConfigModule
    // loads so it wins over `.env` (dotenv does not override existing process.env).
    // The local `.env` ships a malformed `WORK_SPACE_INVITATION_TOKEN_EXPIRED="7d%"`
    // (trailing `%`) which jsonwebtoken rejects — pinning it here keeps the e2e
    // independent of that.
    process.env.WORK_SPACE_INVITATION_TOKEN_EXPIRED = '7d';
    process.env.WORK_SPACE_INVITATION_TOKEN_SECRET_KEY ??= 'super_23';

    const { Test } = await import('@nestjs/testing');

    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider('IEmailService')
        .useValue(emailStub)
        .compile();

    const app = moduleRef.createNestApplication({ rawBody: true });

    const configService = app.get(ConfigService);
    const globalPrefix =
        configService.get<string>('app.globalPrefix') ?? '/api';
    const versionEnable = configService.get('app.urlVersion.enable');
    const versionPrefix =
        configService.get<string>('app.urlVersion.prefix') ?? 'v';
    const version = configService.get<string>('app.urlVersion.version') ?? '1';

    app.setGlobalPrefix(globalPrefix);
    app.use(cookieParser());
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versionPrefix,
        });
    }

    await app.init();

    const base = versionEnable
        ? `${globalPrefix}/${versionPrefix}${version}`
        : globalPrefix;

    return {
        app,
        base,
        close: () => app.close(),
    };
}
