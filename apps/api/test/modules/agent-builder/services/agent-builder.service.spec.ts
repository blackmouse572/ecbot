import { EMPTY_SUGGESTION } from '@repo/agent-blueprint';
import { AgentBuilderService } from '../../../../src/modules/agent-builder/services/agent-builder.service';

const config = { get: (k: string) => (k === 'agentBuilder.suggestTtlMs' ? 86_400_000 : undefined) } as any;

function setup(overrides: { cached?: unknown; answers?: unknown; fail?: boolean } = {}) {
    const typesafe = {
        systemOne: jest.fn(async () => {
            if (overrides.fail) throw new Error('down');
            return overrides.answers ?? { business_type: { type: 'choice', choice: 'beauty', confidence: 0.95 } };
        }),
    };
    const cache = { get: jest.fn(async () => overrides.cached), set: jest.fn() };
    return { typesafe, cache, service: new AgentBuilderService(typesafe as any, cache as any, config) };
}

describe('AgentBuilderService.suggest', () => {
    it('returns a cached suggestion without calling TypeSafe', async () => {
        const cached = { ...EMPTY_SUGGESTION, businessType: { value: 'hotel', confidence: 0.9 } };
        const { service, typesafe } = setup({ cached });
        await expect(service.suggest('homestay in Hoi An')).resolves.toEqual(cached);
        expect(typesafe.systemOne).not.toHaveBeenCalled();
    });

    it('calls TypeSafe, maps the answers and caches them for 24h', async () => {
        const { service, cache, typesafe } = setup();
        const out = await service.suggest('  Nail spa in Da Nang  ');
        expect(typesafe.systemOne).toHaveBeenCalledWith('Nail spa in Da Nang', expect.objectContaining({ business_type: expect.any(Object) }));
        expect(out.businessType).toEqual({ value: 'beauty', confidence: 0.95 });
        expect(cache.set).toHaveBeenCalledWith(AgentBuilderService.cacheKey('Nail spa in Da Nang'), out, 86_400_000);
    });

    it('returns the empty suggestion and caches nothing when TypeSafe fails', async () => {
        const { service, cache } = setup({ fail: true });
        await expect(service.suggest('x')).resolves.toEqual(EMPTY_SUGGESTION);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('ignores malformed answers', async () => {
        const { service } = setup({ answers: { business_type: { type: 'choice', choice: 42 }, goal__take_orders: { type: 'noul', noul: 'high' } } });
        const out = await service.suggest('x');
        expect(out.businessType).toBeNull();
        expect(out.goals).toEqual({});
    });

    it('normalises case and spacing in the cache key', () => {
        expect(AgentBuilderService.cacheKey(' Nail  Spa ')).toBe(AgentBuilderService.cacheKey('nail spa'));
        expect(AgentBuilderService.cacheKey('x')).toMatch(/^agent-builder:suggest:v1:[a-f0-9]{64}$/);
    });
});
