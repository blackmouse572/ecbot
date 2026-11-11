import { readdirSync } from 'fs';
import { join } from 'path';

// Every in-process cron must fire only at minute :00 or :30. Production
// Postgres (Neon Free) suspends after 5 idle minutes, and these crons run
// inside the api, which uptime checks keep awake. A cron that queries the
// database more often, or at odd minutes, wakes the database again before it
// can suspend and burns the monthly compute allowance (November 2026).
const ALLOWED_MINUTES = new Set([0, 30]);
const SRC = join(__dirname, '../../../src');

function schedulerFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return schedulerFiles(path);
        return entry.name.endsWith('.scheduler.ts') ? [path] : [];
    });
}

function expandField(field: string, max: number): number[] {
    return field.split(',').flatMap(part => {
        const [range, step = '1'] = part.split('/');
        const [from, to] =
            range === '*'
                ? [0, max]
                : range.includes('-')
                  ? range.split('-').map(Number)
                  : [Number(range), part.includes('/') ? max : Number(range)];
        const values: number[] = [];
        for (let v = from; v <= to; v += Number(step)) values.push(v);
        return values;
    });
}

function cronMinutes(cronTime: string): number[] {
    const fields = cronTime.trim().split(/\s+/);

    // Six fields start with seconds, which must be one fixed value.
    if (fields.length === 6) {
        expect(expandField(fields[0], 59)).toHaveLength(1);

        return expandField(fields[1], 59);
    }

    return expandField(fields[0], 59);
}

function collectCrons(): Array<[string, string]> {
    return schedulerFiles(SRC).flatMap(file => {
        const exported = Object.values(
            jest.requireActual<Record<string, unknown>>(file)
        );

        return exported
            .filter(
                (value): value is { name: string; prototype: object } =>
                    typeof value === 'function'
            )
            .flatMap(cls =>
                Object.getOwnPropertyNames(cls.prototype)
                    .map(name => ({
                        name,
                        options: Reflect.getMetadata(
                            'SCHEDULE_CRON_OPTIONS',
                            (cls.prototype as Record<string, object>)[name]
                        ) as { cronTime: string } | undefined,
                    }))
                    .filter(({ options }) => options)
                    .map(
                        ({ name, options }) =>
                            [
                                `${cls.name}.${name}`,
                                String(options!.cronTime),
                            ] as [string, string]
                    )
            );
    });
}

describe('in-process cron cadence', () => {
    const crons = collectCrons();

    it('finds the schedulers', () => {
        expect(crons.length).toBeGreaterThan(0);
    });

    it.each(crons)('%s (%s) fires only at :00 or :30', (_name, cronTime) => {
        const offMinutes = cronMinutes(cronTime).filter(
            minute => !ALLOWED_MINUTES.has(minute)
        );

        expect(offMinutes).toEqual([]);
    });
});
