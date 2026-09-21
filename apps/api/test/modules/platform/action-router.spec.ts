import { ActionRouter } from '../../../src/modules/platform/services/action-router.service';

describe('ActionRouter', () => {
    it('runs a registered handler and reports handled', async () => {
        const r = new ActionRouter();
        const handler = jest.fn();
        r.register('confirm', handler);
        expect(await r.dispatch('confirm', { value: 'v' } as any)).toBe(true);
        expect(handler).toHaveBeenCalledWith({ value: 'v' });
    });

    it('reports not-handled for an unregistered action', async () => {
        const r = new ActionRouter();
        expect(await r.dispatch('unknown', {} as any)).toBe(false);
    });
});
