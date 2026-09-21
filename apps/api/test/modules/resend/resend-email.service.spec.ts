import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResendEmailService } from '../../../src/modules/resend/services/resend-email.service';

describe('ResendEmailService', () => {
    let service: ResendEmailService;

    const mockConfigService = {
        get: jest.fn(),
    };

    const build = async (): Promise<void> => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResendEmailService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<ResendEmailService>(ResendEmailService);
    };

    beforeEach(async () => {
        mockConfigService.get.mockReturnValue('');
        await build();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('constructs with an empty RESEND_API_KEY without throwing', () => {
        expect(service).toBeDefined();
    });

    it('rejects a send with the SDK message when the key is empty', async () => {
        await expect(
            service.sendEmail({
                from: 'a@eccho.ai',
                to: 'b@eccho.ai',
                subject: 'test',
                text: '',
            })
        ).rejects.toThrow(
            'Missing API key. Pass it to the constructor `new Resend("re_123")`'
        );
    });
});
