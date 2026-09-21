import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: './swagger.json',
    output: '../../packages/client/src/client',
    plugins: ['@hey-api/client-axios'],
});
