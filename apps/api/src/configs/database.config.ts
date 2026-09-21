import { registerAs } from '@nestjs/config';

export default registerAs(
    'database',
    (): Record<string, any> => ({
        url:
            process.env?.DATABASE_URL ??
            'postgresql://postgres:password@localhost:5432/eccho',

        debug: process.env.DATABASE_DEBUG === 'true',
        ssl: process.env.DATABASE_SSL === 'true',
    })
);
