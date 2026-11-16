import { ENUM_FEATURE_FLAG } from 'src/modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from 'src/modules/feature-flag/services/feature-flag.service';

describe('FeatureFlagService', () => {
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
