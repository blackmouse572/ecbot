import axios from 'axios';
import { fetchAsBase64 } from '@app/common/utils/fetch-as-base64.util';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchAsBase64', () => {
    afterEach(() => jest.resetAllMocks());

    it('returns a data URL on success', async () => {
        const fakeBytes = Buffer.from('fake-image-bytes');
        mockedAxios.get.mockResolvedValueOnce({
            data: fakeBytes,
            headers: { 'content-type': 'image/jpeg' },
        });

        const result = await fetchAsBase64('https://example.com/avatar.jpg');

        expect(result).toBe(
            `data:image/jpeg;base64,${fakeBytes.toString('base64')}`
        );
        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://example.com/avatar.jpg',
            {
                responseType: 'arraybuffer',
                timeout: 5000,
            }
        );
    });

    it('returns undefined when axios throws', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        const result = await fetchAsBase64('https://example.com/avatar.jpg');
        expect(result).toBeUndefined();
    });

    it('returns undefined for a falsy URL', async () => {
        const result = await fetchAsBase64('');
        expect(result).toBeUndefined();
        expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('falls back to image/jpeg when content-type header is missing', async () => {
        const fakeBytes = Buffer.from('bytes');
        mockedAxios.get.mockResolvedValueOnce({ data: fakeBytes, headers: {} });
        const result = await fetchAsBase64('https://example.com/pic');
        expect(result).toBe(
            `data:image/jpeg;base64,${fakeBytes.toString('base64')}`
        );
    });

    it('strips charset parameters from content-type', async () => {
        const fakeBytes = Buffer.from('bytes');
        mockedAxios.get.mockResolvedValueOnce({
            data: fakeBytes,
            headers: { 'content-type': 'image/jpeg; charset=utf-8' },
        });
        const result = await fetchAsBase64('https://example.com/pic');
        expect(result).toBe(
            `data:image/jpeg;base64,${fakeBytes.toString('base64')}`
        );
    });
});
