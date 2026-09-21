import { ClientCredentialService } from '../../../src/modules/client-credential/services/client-credential.service';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

describe('ClientCredentialService', () => {
    let service: ClientCredentialService;

    const mockConfig = { get: jest.fn().mockReturnValue('test') };
    const mockString = { random: jest.fn() };
    const mockHash = { sha256: jest.fn(), sha256Compare: jest.fn() };
    const mockDate = { create: jest.fn() };
    const mockRepo = {
        create: jest.fn(),
        find: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ClientCredentialService(
            mockConfig as any,
            mockString as any,
            mockHash as any,
            mockDate as any,
            mockRepo as any
        );
    });

    describe('createKey / createSecret / createHash', () => {
        it('prefixes the key with the env', async () => {
            mockString.random.mockReturnValue('R'.repeat(25));
            const key = await service.createKey();
            expect(key).toBe(`test_${'R'.repeat(25)}`);
        });

        it('hashes as sha256(key:secret)', async () => {
            mockHash.sha256.mockReturnValue('HASHED');
            const hash = await service.createHash('k', 's');
            expect(mockHash.sha256).toHaveBeenCalledWith('k:s');
            expect(hash).toBe('HASHED');
        });
    });

    describe('create', () => {
        it('returns id + key + secret once and persists an active hashed credential', async () => {
            mockString.random
                .mockReturnValueOnce('K'.repeat(25)) // key random
                .mockReturnValueOnce('S'.repeat(35)); // secret
            mockHash.sha256.mockReturnValue('THEHASH');
            mockRepo.create.mockImplementation(async (e: any) => {
                e.id = 'uuid-1';
                return e;
            });

            const workspace = { id: 'ws-1' } as WorkspaceEntity;
            const result = await service.create(
                workspace,
                { name: 'My Widget' },
                'user-1'
            );

            expect(result).toEqual({
                id: 'uuid-1',
                key: `test_${'K'.repeat(25)}`,
                secret: 'S'.repeat(35),
            });

            const persisted = mockRepo.create.mock.calls[0][0];
            expect(persisted.workspace).toBe(workspace);
            expect(persisted.name).toBe('My Widget');
            expect(persisted.isActive).toBe(true);
            expect(persisted.hash).toBe('THEHASH');
            expect(persisted.createdBy).toBe('user-1');
            // secret is never persisted in plaintext
            expect(persisted.secret).toBeUndefined();
        });

        it('sets start/end dates only when both are provided', async () => {
            mockString.random.mockReturnValue('X'.repeat(35));
            mockHash.sha256.mockReturnValue('H');
            mockDate.create.mockImplementation((d: string) => new Date(d));
            mockRepo.create.mockImplementation(async (e: any) => e);

            await service.create(
                { id: 'ws' } as WorkspaceEntity,
                {
                    name: 'n',
                    startDate: '2026-01-01',
                    endDate: '2026-12-31',
                },
                undefined
            );

            const persisted = mockRepo.create.mock.calls[0][0];
            expect(persisted.startDate).toBeInstanceOf(Date);
            expect(persisted.endDate).toBeInstanceOf(Date);
        });
    });

    describe('validateHash', () => {
        it('delegates to sha256Compare', async () => {
            mockHash.sha256Compare.mockReturnValue(true);
            await expect(service.validateHash('a', 'b')).resolves.toBe(true);
            expect(mockHash.sha256Compare).toHaveBeenCalledWith('a', 'b');
        });
    });

    describe('findOneByActiveKey', () => {
        it('queries by key with isActive true', async () => {
            mockRepo.findOne.mockResolvedValue({ id: 'c1' });
            await service.findOneByActiveKey('test_k');
            expect(mockRepo.findOne).toHaveBeenCalledWith(
                { key: 'test_k', isActive: true },
                undefined
            );
        });
    });
});
