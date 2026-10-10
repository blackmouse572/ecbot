import { Dictionary } from '@mikro-orm/core';

export class DatabaseSslHelper {
    /**
     * Postgres driver options for TLS. The server certificate is always
     * verified; providers with a private CA pass it as `ca` (PEM, newlines
     * may be escaped as `\n` so it fits in a single env var).
     */
    static driverOptions(
        enabled: boolean,
        ca?: string
    ): Dictionary | undefined {
        if (!enabled) {
            return undefined;
        }

        return {
            connection: {
                ssl: {
                    rejectUnauthorized: true,
                    ...(ca && { ca: ca.replace(/\\n/g, '\n') }),
                },
            },
        };
    }
}
