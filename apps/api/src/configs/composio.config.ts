import { registerAs } from '@nestjs/config';

export default registerAs(
    'composio',
    (): Record<string, any> => ({
        apiKey: process.env.COMPOSIO_API_KEY,
        baseUrl:
            process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev',
    })
);
