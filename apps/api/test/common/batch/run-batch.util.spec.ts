import { ConflictException, NotFoundException } from '@nestjs/common';
import {
    resolveBatchFailureReason,
    runBatch,
} from '@app/common/batch/utils/run-batch.util';

describe('runBatch', () => {
    it('reports every id as succeeded when the handler never throws', async () => {
        const handler = jest.fn().mockResolvedValue(undefined);

        const result = await runBatch(['a', 'b', 'c'], handler);

        expect(result).toEqual({ succeeded: ['a', 'b', 'c'], failed: [] });
        expect(handler).toHaveBeenCalledTimes(3);
    });

    it('keeps processing the remaining ids after one fails', async () => {
        const handler = jest.fn(async (id: string) => {
            if (id === 'b') {
                throw new ConflictException('tool.delete.error.referenced');
            }
        });

        const result = await runBatch(['a', 'b', 'c'], handler);

        expect(result.succeeded).toEqual(['a', 'c']);
        expect(result.failed).toEqual([
            { id: 'b', reason: 'tool.delete.error.referenced' },
        ]);
    });

    it('reports every id as failed when the handler always throws', async () => {
        const handler = jest.fn().mockRejectedValue(
            new NotFoundException({
                statusCode: 5000,
                message: 'chatbot.error.notFound',
            })
        );

        const result = await runBatch(['a', 'b'], handler);

        expect(result.succeeded).toEqual([]);
        expect(result.failed).toEqual([
            { id: 'a', reason: 'chatbot.error.notFound' },
            { id: 'b', reason: 'chatbot.error.notFound' },
        ]);
    });

    it('runs the handler sequentially', async () => {
        const running: string[] = [];
        const handler = jest.fn(async (id: string) => {
            running.push(`start:${id}`);
            await Promise.resolve();
            running.push(`end:${id}`);
        });

        await runBatch(['a', 'b'], handler);

        expect(running).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
    });

    it('returns an empty result for an empty id list', async () => {
        const handler = jest.fn();

        const result = await runBatch([], handler);

        expect(result).toEqual({ succeeded: [], failed: [] });
        expect(handler).not.toHaveBeenCalled();
    });
});

describe('resolveBatchFailureReason', () => {
    it('reads the key from an object-bodied HttpException', () => {
        const error = new NotFoundException({
            statusCode: 5000,
            message: 'chatbot.error.notFound',
        });

        expect(resolveBatchFailureReason(error)).toBe('chatbot.error.notFound');
    });

    it('reads the key from a string-bodied HttpException', () => {
        expect(
            resolveBatchFailureReason(
                new NotFoundException('skill.get.error.notFound')
            )
        ).toBe('skill.get.error.notFound');
    });

    it('falls back to the generic key for a non-error value', () => {
        expect(resolveBatchFailureReason('boom')).toBe(
            'http.serverError.internalServerError'
        );
    });
});
