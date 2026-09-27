import { registerAs } from '@nestjs/config';

export default registerAs(
    'ai',
    (): Record<string, any> => ({
        backend: {
            url: process.env.AI_BACKEND_URL || 'http://localhost:8000',
        },
        internalToken: process.env.API_INTERNAL_TOKEN || '',
    })
);
