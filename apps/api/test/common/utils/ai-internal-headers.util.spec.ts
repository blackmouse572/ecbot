import { ConfigService } from '@nestjs/config';
import { getInternalTokenHeader } from '@app/common/utils/ai-internal-headers.util';

describe('getInternalTokenHeader', () => {
    it('returns the X-Internal-Token header from the ai.internalToken config value', () => {
        const configService = { get: jest.fn().mockReturnValue('shared-secret') };

        const headers = getInternalTokenHeader(configService as unknown as ConfigService);

        expect(configService.get).toHaveBeenCalledWith('ai.internalToken');
        expect(headers).toEqual({ 'X-Internal-Token': 'shared-secret' });
    });

    it('falls back to an empty string when the token is not configured', () => {
        const configService = { get: jest.fn().mockReturnValue(undefined) };

        const headers = getInternalTokenHeader(configService as unknown as ConfigService);

        expect(headers).toEqual({ 'X-Internal-Token': '' });
    });
});
