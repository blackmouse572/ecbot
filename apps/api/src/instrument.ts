import * as Sentry from '@sentry/nestjs';
import { Logger } from '@nestjs/common';
import { inspect } from 'node:util';
import debugConfigFunction from 'src/configs/debug.config';
import appConfigFunction from 'src/configs/app.config';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { LOGGER_EXCLUDED_ROUTES } from 'src/common/logger/constants/logger.constant';
import 'dotenv/config';

const appConfigs = appConfigFunction();
const debugConfigs = debugConfigFunction();
const helperStringService = new HelperStringService();
const unhandledLogger = new Logger('UnhandledError');

// Sentry's default uncaughtException/unhandledRejection integrations fall
// back to raw `console.error(value)`. For a non-Error rejection (e.g. an
// in-flight ioredis/BullMQ command rejected on shutdown) that dumps the
// whole object to stdout — one array element per line. Cloud Run bills that
// as log ingestion: the 2026-09-09 incident was ~27GB / 47k lines from a
// single rejection. Bound and format instead of ever handing a raw value
// to console.
export function formatUnhandledError(value: unknown): string {
    if (value instanceof Error) {
        return value.stack ?? value.message;
    }

    return inspect(value, {
        depth: 2,
        maxArrayLength: 10,
        maxStringLength: 500,
        breakLength: 200,
    });
}

if (debugConfigs.sentry.dsn) {
    Sentry.init({
        dsn: debugConfigs.sentry.dsn,
        debug: false,
        environment: appConfigs.env,
        release: appConfigs.version,
        // Profiling (@sentry/profiling-node) loads a native CPU profiler that
        // costs ~15MB+ RSS at boot — an unaffordable luxury on a 512MB box.
        // Keep lightweight error + trace reporting, drop profiling entirely.
        //
        // `integrations` as a function REPLACES the defaults (passing an
        // array would just concat) — used here to swap out the two
        // integrations that dump raw values to stdout (see
        // formatUnhandledError above). OnUncaughtException still reports to
        // Sentry; OnUnhandledRejection is replaced below by our own
        // process.on('unhandledRejection', ...) so console output stays
        // bounded either way.
        integrations: defaultIntegrations => [
            ...defaultIntegrations.filter(
                integration =>
                    integration.name !== 'OnUncaughtException' &&
                    integration.name !== 'OnUnhandledRejection'
            ),
            Sentry.onUncaughtExceptionIntegration({
                onFatalError: error => {
                    unhandledLogger.error(formatUnhandledError(error));
                    const client = Sentry.getClient();
                    if (!client) {
                        process.exit(1);
                        return;
                    }
                    Promise.resolve(client.close(2000)).finally(() =>
                        process.exit(1)
                    );
                },
            }),
        ],
        tracesSampleRate:
            appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION ? 0.1 : 0.0,
        profilesSampleRate: 0.0,
        normalizeDepth: 3,
        maxValueLength: 1000,
        attachStacktrace: false,
        sendDefaultPii: false,
        maxBreadcrumbs: 30,
        beforeSend(event) {
            if (event.exception?.values) {
                const exception = event.exception.values[0];
                const isWorkerException = exception?.type === 'WorkerException';

                if (
                    isWorkerException &&
                    exception.mechanism?.data?.fatal === false
                ) {
                    // Don't send non-fatal WorkerExceptions to Sentry
                    return null;
                }
            }

            if (event.request) {
                // Filter out excluded routes
                const url = event.request.url;

                if (
                    helperStringService.checkWildcardUrl(
                        url,
                        LOGGER_EXCLUDED_ROUTES
                    )
                ) {
                    return null;
                }
            }

            if (event.request && event.contexts && event.contexts.response) {
                const statusCode = event.contexts.response.status_code;
                // Only send events for errors (5xx status codes)
                if (statusCode && statusCode < 500) {
                    return null;
                }
            }

            if (event.level === 'info' || event.level === 'debug') {
                // Don't send info and debug level events
                return null;
            }

            return event;
        },
        tracesSampler: samplingContext => {
            const transaction = samplingContext?.transactionContext;

            if (
                appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION &&
                transaction?.data?.status === 'ok'
            ) {
                // Only sample 5% of successful transactions
                return 0.05;
            }

            // Use normal sampling rate for errors or non-production
            return appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION
                ? 0.3
                : 1.0;
        },
    });

    // Replaces the OnUnhandledRejection integration filtered out above —
    // same Sentry capture, but logs through formatUnhandledError() instead
    // of a raw console.error(reason).
    process.on('unhandledRejection', reason => {
        unhandledLogger.error(formatUnhandledError(reason));
        Sentry.captureException(reason, {
            originalException: reason,
            captureContext: {
                extra: { unhandledPromiseRejection: true },
                level: 'error',
            },
            mechanism: {
                handled: false,
                type: 'auto.node.onunhandledrejection',
            },
        });
    });
}
