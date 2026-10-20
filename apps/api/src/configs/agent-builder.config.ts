import { registerAs } from '@nestjs/config';

export default registerAs(
    'agentBuilder',
    (): Record<string, any> => ({
        suggestTtlMs: 86_400_000,
        // #256: fail fast. apps/ai is woken when the builder opens, so a
        // warm call answers in 2 to 5s.
        decisionTimeoutMs: 8000,
        warmTimeoutMs: 30000,
    })
);
