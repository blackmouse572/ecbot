import { existsSync } from 'fs';
import { createRequire } from 'node:module';
import { join } from 'path';
import { DynamicModule } from '@nestjs/common';
import { ConfigFactory } from '@nestjs/config';

// `src/ee` is gitignored in the public repo and materialised only by the
// enterprise overlay. At runtime __dirname is dist/app, so this resolves
// to dist/ee, the compiled output of src/ee.
const EE_DIR = join(__dirname, '..', 'ee');

export function loadEnterpriseModules(): DynamicModule[] {
    if (!existsSync(EE_DIR)) {
        if (process.env.ECCHO_EDITION === 'enterprise') {
            throw new Error(
                `ECCHO_EDITION=enterprise but ${EE_DIR} is missing`
            );
        }
        return [];
    }
    // This repo's eslint sets noInlineConfig, so no-require-imports can't
    // be disabled inline; createRequire(__filename) is the sanctioned
    // equivalent of a bare require.
    const requireFromHere = createRequire(__filename);
    const { EnterpriseModule } = requireFromHere(
        join(EE_DIR, 'enterprise.module')
    );
    return [EnterpriseModule.forRoot()];
}

// Enterprise config factories live at src/ee/configs/index.ts (default export:
// ConfigFactory[]). Optional even inside the overlay — an overlay without
// config is legal — so absence never throws here; loadEnterpriseModules()
// already guards the overlay itself.
export function loadEnterpriseConfigs(): ConfigFactory[] {
    const dir = join(EE_DIR, 'configs');
    if (!existsSync(dir)) return [];
    const requireFromHere = createRequire(__filename);
    const configs = requireFromHere(join(dir, 'index')).default;
    return Array.isArray(configs) ? configs : [configs];
}

// Enterprise seed module lives at src/ee/migration/ee-migration.module.ts
// (default build output: dist/ee/migration/ee-migration.module.js). Seeding
// an open-engine install must always work, so absence never throws here,
// even when ECCHO_EDITION=enterprise — unlike loadEnterpriseModules().
export function loadEnterpriseSeedModules(): DynamicModule[] {
    const migrationModulePath = join(
        EE_DIR,
        'migration',
        'ee-migration.module'
    );
    if (
        !existsSync(`${migrationModulePath}.js`) &&
        !existsSync(`${migrationModulePath}.ts`)
    ) {
        return [];
    }
    const requireFromHere = createRequire(__filename);
    const { EeMigrationModule } = requireFromHere(migrationModulePath);
    return [EeMigrationModule];
}
