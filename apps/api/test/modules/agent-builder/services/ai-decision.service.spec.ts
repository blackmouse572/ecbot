import { of } from 'rxjs';

jest.mock('@app/common/utils/gcp-id-token.util', () => ({
    getInternalAuthHeader: jest.fn(async () => ({ Authorization: 'Bearer id-token' })),
}));

import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import { AiDecisionService } from '../../../../src/modules/agent-builder/services/ai-decision.service';

const config = { get: (k: string) => ({ 'ai.backend.url': 'http://ai:8000', 'agentBuilder.decisionTimeoutMs': 15000, 'ai.internalToken': 'internal' } as Record<string, unknown>)[k] } as any;

describe('AiDecisionService', () => {
    it('posts state and questions to apps/ai and returns the answers', async () => {
        const post = jest.fn(() => of({ data: { data: { answers: { a: { type: 'noul', noul: 0.9 } } } } }));
        const s = new AiDecisionService({ post } as any, config);
        const out = await s.systemOne('hello', { a: { type: 'noul', instructions: 'q' } });
        expect(out).toEqual({ a: { type: 'noul', noul: 0.9 } });
        const [url, body, opts] = post.mock.calls[0] as unknown as [string, unknown, { timeout: number; headers: Record<string, string> }];
        expect(url).toBe('http://ai:8000/api/decision/system-one');
        expect(body).toEqual({ state: 'hello', questions: { a: { type: 'noul', instructions: 'q' } } });
        expect(opts.timeout).toBe(15000);
        expect(getInternalAuthHeader).toHaveBeenCalledWith('http://ai:8000');
        // apps/ai rejects decision calls without the shared internal token.
        expect(opts.headers).toEqual({ Authorization: 'Bearer id-token', 'X-Internal-Token': 'internal', 'Content-Type': 'application/json' });
    });

    it('returns no answers when apps/ai sends none', async () => {
        const s = new AiDecisionService({ post: () => of({ data: {} }) } as any, config);
        await expect(s.systemOne('x', {})).resolves.toEqual({});
    });

    // The handoff check runs before the customer sees any reply, so it cannot
    // wait the agent builder's 15s.
    it('uses a caller-given timeout over the configured one', async () => {
        const post = jest.fn(() => of({ data: {} }));
        const s = new AiDecisionService({ post } as any, config);
        await s.systemOne('x', {}, 5000);
        const [, , opts] = post.mock.calls[0] as unknown as [string, unknown, { timeout: number }];
        expect(opts.timeout).toBe(5000);
    });
});
