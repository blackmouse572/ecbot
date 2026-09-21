import { existsSync } from 'fs';

// EE_DIR is computed at module load, so each test re-requires the module
// inside jest.isolateModules after arranging existsSync + ECCHO_EDITION.
jest.mock('fs', () => ({
    existsSync: jest.fn(),
}));

const mockedExistsSync = existsSync as jest.Mock;

describe('loadEnterpriseModules', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
        jest.resetAllMocks();
    });

    it('returns [] when the overlay is missing and ECCHO_EDITION is unset', () => {
        mockedExistsSync.mockReturnValue(false);
        process.env = { ...originalEnv };
        delete process.env.ECCHO_EDITION;

        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const loader = require('@app/app/enterprise.loader');

            expect(loader.loadEnterpriseModules()).toEqual([]);
        });
    });

    it('throws when ECCHO_EDITION=enterprise but the overlay is missing', () => {
        mockedExistsSync.mockReturnValue(false);
        process.env = { ...originalEnv, ECCHO_EDITION: 'enterprise' };

        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const loader = require('@app/app/enterprise.loader');

            expect(() => loader.loadEnterpriseModules()).toThrow(
                'ECCHO_EDITION=enterprise'
            );
        });
    });
});

describe('loadEnterpriseConfigs', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
        jest.resetAllMocks();
    });

    // The require target is resolved with createRequire(__filename), which
    // escapes jest's module registry by design (same reason app.module.ts's
    // loader uses it) — jest.mock cannot intercept it, and a spec must never
    // create/delete files under src/ (src/ee is the real overlay in the
    // enterprise build). The present-overlay path is covered by the boot
    // check in the task report instead.
    it('returns [] when ee/configs is absent, even when ECCHO_EDITION=enterprise', () => {
        mockedExistsSync.mockReturnValue(false);
        process.env = { ...originalEnv, ECCHO_EDITION: 'enterprise' };

        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const loader = require('@app/app/enterprise.loader');

            expect(loader.loadEnterpriseConfigs()).toEqual([]);
        });
    });
});

describe('loadEnterpriseSeedModules', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
        jest.resetAllMocks();
    });

    // Same createRequire escape-hatch as loadEnterpriseConfigs above: the
    // present-overlay path is covered by the boot check in the task report,
    // not here. Seeding an open-engine install must always work, so this
    // never throws — even when ECCHO_EDITION=enterprise.
    it('returns [] when ee/migration/ee-migration.module is absent, even when ECCHO_EDITION=enterprise', () => {
        mockedExistsSync.mockReturnValue(false);
        process.env = { ...originalEnv, ECCHO_EDITION: 'enterprise' };

        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const loader = require('@app/app/enterprise.loader');

            expect(loader.loadEnterpriseSeedModules()).toEqual([]);
        });
    });
});
