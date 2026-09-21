import { GoogleAuth } from 'google-auth-library';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';

jest.mock('google-auth-library');
const MockedGoogleAuth = GoogleAuth as jest.MockedClass<typeof GoogleAuth>;

describe('getInternalAuthHeader', () => {
    afterEach(() => jest.resetAllMocks());

    it('returns the Authorization header from a fetched ID token client', async () => {
        const getRequestHeaders = jest
            .fn()
            .mockResolvedValueOnce({ Authorization: 'Bearer fake-id-token' });
        const getIdTokenClient = jest
            .fn()
            .mockResolvedValueOnce({ getRequestHeaders });
        MockedGoogleAuth.mockImplementationOnce(
            () => ({ getIdTokenClient }) as unknown as GoogleAuth
        );

        const result = await getInternalAuthHeader(
            'https://ai-staging.example.run.app'
        );

        expect(getIdTokenClient).toHaveBeenCalledWith(
            'https://ai-staging.example.run.app'
        );
        expect(result).toEqual({ Authorization: 'Bearer fake-id-token' });
    });

    it('fails open to {} when there is no metadata server (local/docker-compose)', async () => {
        const getIdTokenClient = jest
            .fn()
            .mockRejectedValueOnce(new Error('Could not refresh access token'));
        MockedGoogleAuth.mockImplementationOnce(
            () => ({ getIdTokenClient }) as unknown as GoogleAuth
        );

        const result = await getInternalAuthHeader('http://localhost:8000');

        expect(result).toEqual({});
    });

    it('fails open to {} when getRequestHeaders throws', async () => {
        const getRequestHeaders = jest
            .fn()
            .mockRejectedValueOnce(new Error('boom'));
        const getIdTokenClient = jest
            .fn()
            .mockResolvedValueOnce({ getRequestHeaders });
        MockedGoogleAuth.mockImplementationOnce(
            () => ({ getIdTokenClient }) as unknown as GoogleAuth
        );

        const result = await getInternalAuthHeader(
            'https://ai.example.run.app'
        );

        expect(result).toEqual({});
    });
});
