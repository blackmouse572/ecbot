import { ENUM_FEATURE_FLAG } from 'src/modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from 'src/modules/feature-flag/services/feature-flag.service';

describe('FeatureFlagService', () => {
    let now: number;

    beforeEach(() => {
        now = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(() => jest.restoreAllMocks());

    const config = (values: Record<string, boolean>) => ({
        get: jest.fn((key: string) => values[key]),
    });

    describe('without a provider (open edition)', () => {
        it('reads the env switches', async () => {
            const service = new FeatureFlagService(
                config({
                    'featureFlag.orders': true,
                    'featureFlag.customer-sources': false,
                }) as any
            );

            await expect(service.forWorkspace('w1')).resolves.toEqual({
                orders: true,
                customerSources: false,
            });
        });

        it('is off when the switch is unset', async () => {
            const service = new FeatureFlagService(config({}) as any);

            await expect(
                service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1')
            ).resolves.toBe(false);
        });
    });

    describe('with a provider', () => {
        it('asks the provider for the workspace and ignores the env', async () => {
            const provider = { isEnabled: jest.fn().mockResolvedValue(true) };
            const service = new FeatureFlagService(
                config({ 'featureFlag.orders': false }) as any,
                provider
            );

            await expect(
                service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1')
            ).resolves.toBe(true);
            expect(provider.isEnabled).toHaveBeenCalledWith('orders', 'w1');
        });

        it('asks the provider once a minute per flag and workspace', async () => {
            const provider = { isEnabled: jest.fn().mockResolvedValue(true) };
            const service = new FeatureFlagService(config({}) as any, provider);

            await service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1');
            await service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1');
            expect(provider.isEnabled).toHaveBeenCalledTimes(1);

            await service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w2');
            expect(provider.isEnabled).toHaveBeenCalledTimes(2);

            now += 61_000;
            provider.isEnabled.mockResolvedValue(false);
            await expect(
                service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1')
            ).resolves.toBe(false);
        });

        it('keeps the last answer through a short provider outage', async () => {
            const provider = { isEnabled: jest.fn().mockResolvedValue(true) };
            const service = new FeatureFlagService(config({}) as any, provider);
            await service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1');
            provider.isEnabled.mockRejectedValue(new Error('timeout'));

            now += 5 * 60_000;
            await expect(
                service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1')
            ).resolves.toBe(true);

            now += 6 * 60_000;
            await expect(
                service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1')
            ).resolves.toBe(false);
        });

        it('reads a failed lookup as off', async () => {
            const provider = {
                isEnabled: jest.fn().mockRejectedValue(new Error('timeout')),
            };
            const service = new FeatureFlagService(
                config({ 'featureFlag.orders': true }) as any,
                provider
            );

            await expect(
                service.isEnabled(ENUM_FEATURE_FLAG.ORDERS, 'w1')
            ).resolves.toBe(false);
        });
    });
});
