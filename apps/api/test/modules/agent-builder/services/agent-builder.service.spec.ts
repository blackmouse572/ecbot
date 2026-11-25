import { EMPTY_SUGGESTION } from '@repo/agent-blueprint';
import { ENUM_AI_USAGE_SOURCE } from '../../../../src/app/ai-usage-meter.interface';
import { AgentBuilderService } from '../../../../src/modules/agent-builder/services/agent-builder.service';

const config = { get: (k: string) => (k === 'agentBuilder.suggestTtlMs' ? 86_400_000 : undefined) } as any;

const USAGE = { inputTokens: 100, outputTokens: 20, totalTokens: 120 };

function setup(overrides: { cached?: unknown; answers?: unknown; texts?: Record<string, string>; extractUsage?: typeof USAGE; fail?: boolean; extractFail?: boolean; meter?: unknown } = {}) {
    const aiDecision = {
        warm: jest.fn(async () => {
            if (overrides.fail) throw new Error('down');
        }),
        decide: jest.fn(async () => {
            if (overrides.fail) throw new Error('down');
            return {
                answers: overrides.answers ?? { business_type: { type: 'choice', choice: 'beauty', confidence: 0.95 } },
                usage: USAGE,
                model: '~typesafe/jev-latest',
            };
        }),
        extract: jest.fn(async () => {
            if (overrides.extractFail) throw new Error('extract down');
            return {
                answers: overrides.texts ?? { business_name: 'Mây' },
                usage: overrides.extractUsage ?? null,
                model: 'google/gemini-2.5-flash',
            };
        }),
    };
    const cache = { get: jest.fn(async () => overrides.cached), set: jest.fn() };
    return {
        aiDecision,
        cache,
        service: new AgentBuilderService(aiDecision as any, cache as any, config, overrides.meter as any),
    };
}

function meter(allowed: boolean) {
    return { check: jest.fn(async () => ({ allowed })), record: jest.fn(async () => undefined) };
}

describe('AgentBuilderService.suggest', () => {
    it('returns a cached suggestion without calling the apps/ai decision service', async () => {
        const cached = { ...EMPTY_SUGGESTION, businessType: { value: 'hotel', confidence: 0.9 } };
        const { service, aiDecision } = setup({ cached });
        await expect(service.suggest('ws-1', 'homestay in Hoi An')).resolves.toEqual(cached);
        expect(aiDecision.decide).not.toHaveBeenCalled();
        expect(aiDecision.extract).not.toHaveBeenCalled();
    });

    it('calls the apps/ai decision and extract services, maps the answers and caches them for 24h', async () => {
        const { service, cache, aiDecision } = setup();
        const out = await service.suggest('ws-1', '  Nail spa in Da Nang  ');
        expect(aiDecision.decide).toHaveBeenCalledWith('Nail spa in Da Nang', expect.objectContaining({ business_type: expect.any(Object) }));
        expect(aiDecision.extract).toHaveBeenCalledWith('Nail spa in Da Nang', expect.objectContaining({ business_name: expect.any(String) }));
        expect(out.businessType).toEqual({ value: 'beauty', confidence: 0.95 });
        expect(cache.set).toHaveBeenCalledWith(AgentBuilderService.cacheKey('Nail spa in Da Nang'), out, 86_400_000);
    });

    it('returns the empty suggestion and caches nothing when the apps/ai decision service fails', async () => {
        const { service, cache } = setup({ fail: true });
        await expect(service.suggest('ws-1', 'x')).resolves.toEqual(EMPTY_SUGGESTION);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('does not cache an empty answer set from the apps/ai decision service', async () => {
        const { service, cache } = setup({ answers: {}, texts: {} });
        await expect(service.suggest('ws-1', 'x')).resolves.toEqual(EMPTY_SUGGESTION);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('does not cache a suggestion without a business type', async () => {
        const { service, cache } = setup({ answers: { personality: { type: 'choice', choice: 'warm', confidence: 0.9 } } });
        await service.suggest('ws-1', 'x');
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('ignores malformed answers', async () => {
        const { service } = setup({ answers: { business_type: { type: 'choice', choice: 42 }, goal__take_orders: { type: 'noul', noul: 'high' } } });
        const out = await service.suggest('ws-1', 'x');
        expect(out.businessType).toBeNull();
        expect(out.goals).toEqual({});
    });

    // #250: the builder's model call is metered like a reply.
    it('records what the suggestion spent against the workspace', async () => {
        const m = meter(true);
        const { service } = setup({ meter: m });
        await service.suggest('ws-1', 'Nail spa');
        expect(m.check).toHaveBeenCalledWith('ws-1');
        expect(m.record).toHaveBeenCalledWith({
            workspaceId: 'ws-1',
            usage: USAGE,
            source: ENUM_AI_USAGE_SOURCE.AGENT_BUILDER,
            model: '~typesafe/jev-latest',
        });
    });

    it('still returns and caches the suggestion when recording the usage fails', async () => {
        const m = meter(true);
        m.record.mockRejectedValue(new Error('db down'));
        const { service, cache } = setup({ meter: m });
        const out = await service.suggest('ws-1', 'Nail spa');
        expect(out.businessType).toEqual({ value: 'beauty', confidence: 0.95 });
        expect(cache.set).toHaveBeenCalled();
    });

    it('gives no suggestion and calls no model when the workspace is out of tokens', async () => {
        const m = meter(false);
        const { service, aiDecision } = setup({ meter: m });
        await expect(service.suggest('ws-1', 'Nail spa')).resolves.toEqual(EMPTY_SUGGESTION);
        expect(aiDecision.decide).not.toHaveBeenCalled();
        expect(aiDecision.extract).not.toHaveBeenCalled();
        expect(m.record).not.toHaveBeenCalled();
    });

    it('does not ask the meter for a cached suggestion', async () => {
        const m = meter(false);
        const cached = { ...EMPTY_SUGGESTION, businessType: { value: 'hotel', confidence: 0.9 } };
        const { service } = setup({ meter: m, cached });
        await expect(service.suggest('ws-1', 'homestay')).resolves.toEqual(cached);
        expect(m.check).not.toHaveBeenCalled();
    });

    it('normalises case and spacing in the cache key', () => {
        expect(AgentBuilderService.cacheKey(' Nail  Spa ')).toBe(AgentBuilderService.cacheKey('nail spa'));
        expect(AgentBuilderService.cacheKey('x')).toMatch(/^agent-builder:suggest:v2:[a-f0-9]{64}$/);
    });

    // #256/#623: the suggestion also reads details the owner wrote, now through
    // the separate extraction call.
    it('returns the texts read from the description', async () => {
        const { service } = setup({
            answers: {
                business_type: { type: 'choice', choice: 'restaurant', confidence: 0.98 },
            },
            texts: { business_name: 'Mây' },
        });
        const out = await service.suggest('ws-1', 'Quán cà phê Mây');
        expect(out.texts).toEqual({ business_name: 'Mây' });
    });

    it('still returns the decision answers when text extraction fails, without caching them', async () => {
        const { service, cache } = setup({ extractFail: true });
        const out = await service.suggest('ws-1', 'Nail spa');
        expect(out.businessType).toEqual({ value: 'beauty', confidence: 0.95 });
        expect(out.texts).toEqual({});
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('does not cache a suggestion whose extraction returned only empty details', async () => {
        const { service, cache } = setup({ texts: { business_name: '   ', opening_hours: '' } });
        const out = await service.suggest('ws-1', 'Nail spa');
        expect(out.businessType).toEqual({ value: 'beauty', confidence: 0.95 });
        expect(out.texts).toEqual({});
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('meters each model call as its own row, at its own model', async () => {
        const m = meter(true);
        const { service } = setup({
            meter: m,
            extractUsage: { inputTokens: 50, outputTokens: 10, totalTokens: 60 },
        });
        await service.suggest('ws-1', 'Nail spa');
        expect(m.record).toHaveBeenCalledTimes(2);
        expect(m.record).toHaveBeenCalledWith(
            expect.objectContaining({
                usage: USAGE,
                model: '~typesafe/jev-latest',
            })
        );
        expect(m.record).toHaveBeenCalledWith(
            expect.objectContaining({
                usage: { inputTokens: 50, outputTokens: 10, totalTokens: 60 },
                model: 'google/gemini-2.5-flash',
            })
        );
    });
});

describe('AgentBuilderService.warm', () => {
    it('wakes apps/ai', async () => {
        const { service, aiDecision } = setup();
        await service.warm();
        expect(aiDecision.warm).toHaveBeenCalled();
    });

    it('never throws when apps/ai cannot be reached', async () => {
        const { service } = setup({ fail: true });
        await expect(service.warm()).resolves.toBeUndefined();
    });
});
