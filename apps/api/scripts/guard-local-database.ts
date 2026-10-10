import { config } from 'dotenv';

// Hosts a developer's own Postgres answers on: loopback, and the service
// names docker-compose gives it.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', 'database', 'postgres'];

/**
 * Why a destructive schema command must not run against this database, or
 * null when it may. migration:fresh and schema:drop/fresh drop whatever
 * DATABASE_URL points at, and dropping the schema is the only way to clear
 * the append-only audit log, so they are for a local database only.
 */
export function checkLocalDatabase(
    env: Record<string, string | undefined>
): string | null {
    if (env.APP_ENV === 'production') {
        return 'APP_ENV is production.';
    }
    let host: string;
    try {
        host = new URL(env.DATABASE_URL ?? '').hostname;
    } catch {
        return 'DATABASE_URL is missing or not a URL.';
    }
    return LOCAL_HOSTS.includes(host)
        ? null
        : `DATABASE_URL points at ${host}, not a local database.`;
}

if (require.main === module) {
    config();
    const reason = checkLocalDatabase(process.env);
    if (reason) {
        console.error(
            `Refusing to drop the database schema: ${reason} Point DATABASE_URL at a local Postgres to run this.`
        );
        process.exit(1);
    }
}
