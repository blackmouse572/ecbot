import { HttpException } from '@nestjs/common';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';

const DEFAULT_REASON = 'http.serverError.internalServerError';

// Pull the i18n key out of whatever the single-item service threw. Controllers
// throw either `new NotFoundException('some.key')` or
// `new NotFoundException({ statusCode, message: 'some.key' })`.
export function resolveBatchFailureReason(error: unknown): string {
    if (error instanceof HttpException) {
        const response = error.getResponse();

        if (typeof response === 'string') {
            return response;
        }

        const message = (response as { message?: string | string[] })?.message;

        if (Array.isArray(message)) {
            return message[0] ?? DEFAULT_REASON;
        }

        if (typeof message === 'string') {
            return message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return DEFAULT_REASON;
}

/**
 * Run `handler` for every id and collect per-id outcomes instead of failing the
 * whole request. Sequential on purpose: the handlers hit S3, Cloud Tasks and
 * platform APIs, so running them in parallel would hammer those.
 */
export async function runBatch(
    ids: string[],
    handler: (id: string) => Promise<void>
): Promise<BatchResultResponseDto> {
    const result: BatchResultResponseDto = { succeeded: [], failed: [] };

    for (const id of ids) {
        try {
            await handler(id);
            result.succeeded.push(id);
        } catch (error: unknown) {
            result.failed.push({
                id,
                reason: resolveBatchFailureReason(error),
            });
        }
    }

    return result;
}
