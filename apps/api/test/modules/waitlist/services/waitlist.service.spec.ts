import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { WaitlistEntity } from '../../../../src/modules/waitlist/repository/entities/waitlist.entity';
import { WaitlistRepository } from '../../../../src/modules/waitlist/repository/repositories/waitlist.repository';
import { WaitlistService } from '../../../../src/modules/waitlist/services/waitlist.service';

describe('WaitlistService', () => {
    let service: WaitlistService;

    const mockWaitlistRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
        getTotal: jest.fn(),
    };

    const build = async (): Promise<void> => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WaitlistService,
                {
                    provide: WaitlistRepository,
                    useValue: mockWaitlistRepository,
                },
            ],
        }).compile();

        service = module.get<WaitlistService>(WaitlistService);
    };

    beforeEach(async () => {
        await build();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('join', () => {
        it('creates an entry for a new email', async () => {
            mockWaitlistRepository.findOne.mockResolvedValue(null);
            mockWaitlistRepository.create.mockImplementation(
                async (entity: WaitlistEntity) => entity
            );

            const result = await service.join({
                email: 'new@eccho.ai',
                source: 'hero',
                locale: 'vi',
            });

            expect(mockWaitlistRepository.create).toHaveBeenCalledTimes(1);
            expect(result.email).toBe('new@eccho.ai');
            expect(result.source).toBe('hero');
            expect(result.locale).toBe('vi');
        });

        it('is idempotent — an existing email creates no second row', async () => {
            const existing = {
                id: randomUUID(),
                email: 'dup@eccho.ai',
            } as WaitlistEntity;
            mockWaitlistRepository.findOne.mockResolvedValue(existing);

            const result = await service.join({ email: 'dup@eccho.ai' });

            expect(mockWaitlistRepository.create).not.toHaveBeenCalled();
            expect(result).toBe(existing);
        });
    });
});
