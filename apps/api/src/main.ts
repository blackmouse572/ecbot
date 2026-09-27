import './instrument';

import { ConsoleLogger, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication, NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { useContainer, validate } from 'class-validator';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from 'src/app/app.module';
import { AppEnvDto } from 'src/app/dtos/app.env.dto';
import { MessageService } from 'src/common/message/services/message.service';
import swaggerInit from 'src/swagger';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule, {
        abortOnError: true,
        bufferLogs: false,
        rawBody: true,
    });

    const configService = app.get(ConfigService);
    const databaseUri: string = configService.get<string>('database.url');
    const env: string = configService.get<string>('app.env');
    const timezone: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const trustProxyHops: number = configService.get<number>(
        'app.trustProxyHops'
    );
    const globalPrefix: string = configService.get<string>('app.globalPrefix');
    const versioningPrefix: string = configService.get<string>(
        'app.urlVersion.prefix'
    );
    const version: string = configService.get<string>('app.urlVersion.version');

    // enable
    const versionEnable: string = configService.get<string>(
        'app.urlVersion.enable'
    );

    // local tunnel
    const localTunnelConfig = configService.get<{
        enable: boolean;
        subdomain: string;
    }>('app.localTunnel');

    const logger = new Logger('NestJs-Main');
    process.env.NODE_ENV = env;
    process.env.TZ = timezone;

    // logger
    app.useLogger(app.get(PinoLogger));

    // Trust the configured number of reverse-proxy hops (load balancer/CDN) so
    // req.ip — and therefore the throttler's per-client key — reflects the
    // real client instead of the proxy. Without this, every client behind the
    // same load balancer shares one rate-limit bucket.
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);

    // Compression — but never for Server-Sent Events. gzip buffers the response
    // body, which defeats SSE streaming (the chatbot stream proxy would arrive
    // at the client all at once instead of token-by-token).
    app.use(
        compression({
            filter: (req, res) => {
                const contentType = res.getHeader('Content-Type');
                if (
                    typeof contentType === 'string' &&
                    contentType.includes('text/event-stream')
                ) {
                    return false;
                }
                return compression.filter(req, res);
            },
        })
    );

    // Global
    app.setGlobalPrefix(globalPrefix);

    // Cookie Parser
    app.use(cookieParser());

    // For Custom Validation
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Versioning
    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    // Validate Env
    const classEnv = plainToInstance(AppEnvDto, process.env);
    const errors = await validate(classEnv);
    if (errors.length > 0) {
        const messageService = app.get(MessageService);
        const errorsMessage = messageService.setValidationMessage(errors);

        throw new Error('Env Variable Invalid', {
            cause: errorsMessage,
        });
    }

    // Swagger
    await swaggerInit(app);

    app.enableShutdownHooks();

    // Listen
    await app.listen(port, host);

    if (localTunnelConfig.enable) {
        const createTunnel = (await import('localtunnel')).default;
        const tunnel = await createTunnel({
            port,
            subdomain: localTunnelConfig.subdomain,
        });

        logger.log(`✅ LocalTunnel is running at: ${tunnel.url}`);
        tunnel.on('close', () => {
            logger.warn('⚠️ LocalTunnel connection closed.');
        });

        tunnel.on('error', error => {
            logger.error('❌ LocalTunnel error: ', error.message);
        });

        // Not a Nest provider, so no shutdown hook reaches it: close the tunnel
        // sockets on the same signals Nest handles, or the process never exits.
        for (const signal of ['SIGTERM', 'SIGINT'] as const) {
            process.once(signal, () => tunnel.close());
        }
    }

    const loggerContext = 'NestApplication';
    const appUrl = await app.getUrl();
    logger.log(
        `Http versioning is ${versionEnable}.Running on ${appUrl}`,
        loggerContext
    );

    const databaseHost = new URL(databaseUri).host;
    logger.log(`Database connected to ${databaseHost}`, loggerContext);
}
bootstrap();
