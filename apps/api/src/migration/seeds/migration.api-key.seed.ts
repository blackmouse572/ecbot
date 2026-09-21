import { ApiKeyService } from '@app/modules/api-key/services/api-key.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';

type KeyPair = { key: string; secret: string };

interface SeedKeyConfig {
    name: string;
    type: ENUM_API_KEY_TYPE;
    /**
     * Reuses an env var another service already matches against, so the pair is
     * reproducible without introducing seed-only config. Returns null when the
     * var is unset — then a random pair is generated and logged once, and is not
     * recoverable afterwards.
     */
    pin?: () => KeyPair | null;
}

/**
 * `CLOUD_TASKS_SYSTEM_API_KEY` and `E2E_SEED_DEFAULT_API_KEY` are both stored as
 * the `key:secret` header form.
 */
function splitPair(value?: string): KeyPair | null {
    const [key, secret] = (value ?? '').split(':');
    return key && secret ? { key, secret } : null;
}

const SEED_KEYS: SeedKeyConfig[] = [
    {
        name: 'Api Key Default Migration',
        type: ENUM_API_KEY_TYPE.DEFAULT,
        pin: () => splitPair(process.env['E2E_SEED_DEFAULT_API_KEY']),
    },
    {
        name: 'Api Key System Migration',
        type: ENUM_API_KEY_TYPE.SYSTEM,
    },
    {
        name: 'AI Service System Key Migration',
        type: ENUM_API_KEY_TYPE.SYSTEM,
        pin: () => {
            const key = process.env['AI_SERVICE_API_KEY'];
            const secret = process.env['AI_SERVICE_API_SECRET'];
            return key && secret ? { key, secret } : null;
        },
    },
    {
        name: 'Cloud Tasks System Key Migration',
        type: ENUM_API_KEY_TYPE.SYSTEM,
        pin: () => splitPair(process.env['CLOUD_TASKS_SYSTEM_API_KEY']),
    },
    {
        // Shipped in the browser bundle — PUBLIC type only reaches routes
        // marked @ApiKeyPublicProtected().
        name: 'Web Public Key Migration',
        type: ENUM_API_KEY_TYPE.PUBLIC,
    },
];

@Injectable()
export class MigrationApiKeySeed {
    private readonly logger = new Logger(MigrationApiKeySeed.name);

    constructor(
        private readonly em: EntityManager,
        private readonly apiKeyService: ApiKeyService
    ) {}

    private async seedKey(config: SeedKeyConfig): Promise<void> {
        const em = this.em.fork();
        const existing = await em.findOne(ApiKeyEntity, {
            name: config.name,
            deleted: false,
        });
        if (existing) {
            this.logger.log(
                `ApiKey "${config.name}" already exists (id=${existing.id}); skipping.`
            );
            return;
        }

        const pinned = config.pin?.() ?? null;
        const pair: KeyPair = pinned ?? {
            key: await this.apiKeyService.createKey(),
            secret: await this.apiKeyService.createSecret(),
        };

        const created = await this.apiKeyService.createRaw(
            { name: config.name, type: config.type, ...pair },
            { em }
        );

        if (pinned) {
            this.logger.log(
                `Created ApiKey "${config.name}" (id=${created.id}) from the environment.`
            );
            return;
        }

        // Only time these are printed. Not recoverable afterwards.
        this.logger.warn(
            `Created ApiKey "${config.name}" (id=${created.id}) with a generated pair.\n` +
                `  key    ${pair.key}\n` +
                `  secret ${pair.secret}\n` +
                `  Save these now — they cannot be read back.`
        );
    }

    @Command({
        command: 'seed:apikey',
        describe: 'seed api key',
    })
    async seeds(): Promise<void> {
        try {
            for (const config of SEED_KEYS) {
                await this.seedKey(config);
            }
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    @Command({
        command: 'remove:apikey',
        describe: 'remove apikeys',
    })
    async remove(): Promise<void> {
        try {
            await this.apiKeyService.deleteAll();
        } catch (err: any) {
            throw new Error(err.message);
        }
    }
}
