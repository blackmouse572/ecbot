import { registerAs } from '@nestjs/config';

export default registerAs(
    'agentBuilder',
    (): Record<string, any> => ({
        suggestTtlMs: 86_400_000,
        decisionTimeoutMs: 15000,
    })
);
