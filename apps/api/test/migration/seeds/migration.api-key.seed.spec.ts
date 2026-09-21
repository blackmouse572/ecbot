import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';

const DEFAULT_NAME = 'Api Key Default Migration';
const ENV_KEYS = [
    'E2E_SEED_DEFAULT_API_KEY',
    'AI_SERVICE_API_KEY',
    'AI_SERVICE_API_SECRET',
    'CLOUD_TASKS_SYSTEM_API_KEY',
];

describe('MigrationApiKeySeed', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let em: { fork: jest.Mock };
    let apiKeyService: {
        createKey: jest.Mock;
        createSecret: jest.Mock;
        createRaw: jest.Mock;
    };
    let seed: MigrationApiKeySeed;

    beforeEach(() => {
        originalEnv = { ...process.env };
        for (const key of ENV_KEYS) delete process.env[key];

        em = {
            fork: jest
                .fn()
                .mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
        };
        apiKeyService = {
            createKey: jest.fn().mockResolvedValue('generated-key'),
            createSecret: jest.fn().mockResolvedValue('generated-secret'),
            createRaw: jest.fn().mockResolvedValue({ id: 'id-1' }),
        };

        seed = new MigrationApiKeySeed(
            em as any,
            apiKeyService as unknown as ApiKeyService
        );
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    function defaultCallArgs() {
        return apiKeyService.createRaw.mock.calls.find(
            ([data]) => data.name === DEFAULT_NAME
        )?.[0];
    }

    it('pins the DEFAULT key from E2E_SEED_DEFAULT_API_KEY when set', async () => {
        process.env['E2E_SEED_DEFAULT_API_KEY'] = 'abc:def';

        await seed.seeds();

        expect(defaultCallArgs()).toMatchObject({
            name: DEFAULT_NAME,
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: 'abc',
            secret: 'def',
        });
        // 4 of the 5 SEED_KEYS entries fall back to generation; DEFAULT is pinned.
        expect(apiKeyService.createKey).toHaveBeenCalledTimes(4);
        expect(apiKeyService.createSecret).toHaveBeenCalledTimes(4);
    });

    it('generates the DEFAULT key when E2E_SEED_DEFAULT_API_KEY is unset', async () => {
        await seed.seeds();

        expect(defaultCallArgs()).toMatchObject({
            name: DEFAULT_NAME,
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: 'generated-key',
            secret: 'generated-secret',
        });
        expect(apiKeyService.createKey).toHaveBeenCalledTimes(5);
        expect(apiKeyService.createSecret).toHaveBeenCalledTimes(5);
    });
});
