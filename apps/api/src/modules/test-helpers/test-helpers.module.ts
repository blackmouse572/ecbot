import { Module } from '@nestjs/common';
import { TestHelpersController } from './test-helpers.controller';

// Exported so app.module.ts can gate module registration without booting Nest.
// APP_ENV is the real deployment switch (app.config.ts); NODE_ENV is not set in
// the deployed environments and is assigned too late in main.ts to gate this.
export function shouldLoadTestHelpers(env: NodeJS.ProcessEnv): boolean {
    return (
        env.E2E_TEST_HELPERS === 'true' &&
        env.NODE_ENV !== 'production' &&
        env.APP_ENV !== 'production'
    );
}

@Module({ controllers: [TestHelpersController] })
export class TestHelpersModule {}
