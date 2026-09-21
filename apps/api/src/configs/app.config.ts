import { AppEnvDto } from '@app/app/dtos/app.env.dto';
import { validateUtil } from '@app/app/validate-util.ts';
import { registerAs } from '@nestjs/config';
import { version } from 'package.json';

// process.env values are always strings, so feature flags are compared
// against the literal 'true' rather than coerced with Boolean().
const isFlagOn = (value?: string): boolean => value === 'true';

export default registerAs('app', (): Record<string, any> => {
    validateUtil(process.env, AppEnvDto);

    return {
        name: process.env.APP_NAME,
        env: process.env.APP_ENV,
        timezone: process.env.APP_TIMEZONE,
        version,
        globalPrefix: '/api',
        // Origin of this backend as reachable from the public internet
        // (e.g. https://eccho.onrender.com). Used to build absolute URLs for
        // provider-registered webhooks. Distinct from home.url (the frontend).
        backendUrl: process.env.API_BACKEND_URL,

        http: {
            host: process.env.HTTP_HOST,
            port: Number.parseInt(process.env.PORT ?? process.env.HTTP_PORT),
        },
        urlVersion: {
            enable: isFlagOn(process.env.URL_VERSIONING_ENABLE),
            prefix: 'v',
            version: process.env.URL_VERSION,
        },
        localTunnel: {
            enable: isFlagOn(process.env.LOCAL_TUNNEL_ENABLE),
            subdomain: process.env.LOCAL_TUNNEL_SUBDOMAIN,
        },
    };
});
