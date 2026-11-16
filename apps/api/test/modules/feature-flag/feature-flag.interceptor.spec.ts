import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ENUM_FEATURE_FLAG } from 'src/modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagInterceptor } from 'src/modules/feature-flag/interceptors/feature-flag.interceptor';

describe('FeatureFlagInterceptor', () => {
    const isEnabled = jest.fn();
    const reflector = { getAllAndOverride: jest.fn() };
    const interceptor = new FeatureFlagInterceptor(
        reflector as unknown as Reflector,
        { isEnabled } as any
    );
    const context = (workspace?: { id: string }) =>
        ({
            getHandler: () => undefined,
            getClass: () => undefined,
            switchToHttp: () => ({
                getRequest: () => ({ __workspace: workspace }),
            }),
        }) as any;
    const next = { handle: jest.fn(() => of('ok')) };

    beforeEach(() => jest.clearAllMocks());

    it('passes a route with no flag', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);

        await interceptor.intercept(context({ id: 'w1' }), next);

        expect(next.handle).toHaveBeenCalled();
        expect(isEnabled).not.toHaveBeenCalled();
    });

    it("passes while the workspace's flag is on", async () => {
        reflector.getAllAndOverride.mockReturnValue(ENUM_FEATURE_FLAG.ORDERS);
        isEnabled.mockResolvedValue(true);

        await interceptor.intercept(context({ id: 'w1' }), next);

        expect(isEnabled).toHaveBeenCalledWith('orders', 'w1');
        expect(next.handle).toHaveBeenCalled();
    });

    it('404s while the flag is off', async () => {
        reflector.getAllAndOverride.mockReturnValue(ENUM_FEATURE_FLAG.ORDERS);
        isEnabled.mockResolvedValue(false);

        await expect(
            interceptor.intercept(context({ id: 'w1' }), next)
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(next.handle).not.toHaveBeenCalled();
    });

    it('404s a flagged route with no workspace resolved', async () => {
        reflector.getAllAndOverride.mockReturnValue(
            ENUM_FEATURE_FLAG.CUSTOMER_SOURCES
        );

        await expect(
            interceptor.intercept(context(undefined), next)
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
