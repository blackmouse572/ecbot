import { ConfigService } from '@nestjs/config';
import type { FacebookPageService as FacebookPageServiceType } from '@app/common/facebook/services/facebook-page.service';

// The global setup stubs this module, so load the real one.
const { FacebookPageService } = jest.requireActual<{
    FacebookPageService: typeof FacebookPageServiceType;
}>('@app/common/facebook/services/facebook-page.service');

describe('FacebookPageService.getPages', () => {
    const page = (id: string) => ({ id, name: id });

    const build = (get: jest.Mock) => {
        const config = { get: jest.fn().mockReturnValue('v20.0') };
        return new FacebookPageService(
            config as unknown as ConfigService,
            {
                axiosRef: { get },
            } as never
        );
    };

    it('follows paging.next until every Page is collected', async () => {
        const get = jest
            .fn()
            .mockResolvedValueOnce({
                data: {
                    data: [page('1'), page('2')],
                    paging: { next: 'https://graph.facebook.com/next2' },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    data: [page('3')],
                    paging: { next: 'https://graph.facebook.com/next3' },
                },
            })
            .mockResolvedValueOnce({ data: { data: [page('4')] } });

        const pages = await build(get).getPages({
            userId: 'u1',
            accessToken: 't',
        } as never);

        expect(pages.map(p => p.id)).toEqual(['1', '2', '3', '4']);
        expect(get).toHaveBeenCalledTimes(3);
        expect(get.mock.calls[1][0]).toBe('https://graph.facebook.com/next2');
        expect(get.mock.calls[2][0]).toBe('https://graph.facebook.com/next3');
    });

    it('returns a single page of results when there is no paging.next', async () => {
        const get = jest
            .fn()
            .mockResolvedValue({ data: { data: [page('1')] } });
        const pages = await build(get).getPages({ accessToken: 't' } as never);
        expect(pages).toHaveLength(1);
        expect(get).toHaveBeenCalledTimes(1);
    });
});
