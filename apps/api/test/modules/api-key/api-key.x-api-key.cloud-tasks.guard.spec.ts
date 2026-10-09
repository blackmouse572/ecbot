import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyXApiKeyCloudTasksGuard } from '../../../src/modules/api-key/guards/x-api-key/api-key.x-api-key.cloud-tasks.guard';

function contextFor(apiKey: { key: string } | undefined): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ apiKey }) }),
    } as unknown as ExecutionContext;
}

function guardWith(systemApiKey: string | undefined) {
    return new ApiKeyXApiKeyCloudTasksGuard({
        get: (key: string) =>
            key === 'cloudTasks.systemApiKey' ? systemApiKey : undefined,
    } as unknown as ConfigService);
}

describe('ApiKeyXApiKeyCloudTasksGuard', () => {
    it('lets the Cloud Tasks key through', () => {
        expect(
            guardWith('ct-key:ct-secret').canActivate(
                contextFor({ key: 'ct-key' })
            )
        ).toBe(true);
    });

    it('rejects any other SYSTEM key (e.g. the AI service key)', () => {
        expect(() =>
            guardWith('ct-key:ct-secret').canActivate(
                contextFor({ key: 'ai-service-key' })
            )
        ).toThrow(BadRequestException);
    });

    it('fails closed when no Cloud Tasks key is configured', () => {
        expect(() =>
            guardWith(undefined).canActivate(contextFor({ key: '' }))
        ).toThrow(BadRequestException);
    });
});
