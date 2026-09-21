import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';

function ctx(headers: Record<string, any>) {
    const request: any = { headers };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        __request: request,
    } as any;
}

describe('ClientCredentialGuard', () => {
    let guard: ClientCredentialGuard;

    const mockConfig = { get: jest.fn().mockReturnValue('x-api-key') };
    const mockService = {
        findOneByActiveKey: jest.fn(),
        createHash: jest.fn(),
        validateHash: jest.fn(),
    };
    const now = new Date('2026-06-15T00:00:00Z');
    const mockDate = { create: jest.fn().mockReturnValue(now) };

    const workspace = { id: 'ws-1', name: 'Acme', slug: 'acme' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfig.get.mockReturnValue('x-api-key');
        mockDate.create.mockReturnValue(now);
        guard = new ClientCredentialGuard(
            mockConfig as any,
            mockService as any,
            mockDate as any
        );
    });

    it('rejects a missing x-api-key header', async () => {
        await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(
            UnauthorizedException
        );
    });

    it('rejects a malformed header (no colon)', async () => {
        await expect(
            guard.canActivate(ctx({ 'x-api-key': 'nocolon' }))
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown key', async () => {
        mockService.findOneByActiveKey.mockResolvedValue(null);
        await expect(
            guard.canActivate(ctx({ 'x-api-key': 'k:s' }))
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an expired credential', async () => {
        mockService.findOneByActiveKey.mockResolvedValue({
            isActive: true,
            hash: 'H',
            startDate: new Date('2026-01-01Z'),
            endDate: new Date('2026-05-01Z'),
            workspace,
        });
        await expect(
            guard.canActivate(ctx({ 'x-api-key': 'k:s' }))
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a bad secret (hash mismatch)', async () => {
        mockService.findOneByActiveKey.mockResolvedValue({
            isActive: true,
            hash: 'H',
            workspace,
        });
        mockService.createHash.mockResolvedValue('HASHED');
        mockService.validateHash.mockResolvedValue(false);
        await expect(
            guard.canActivate(ctx({ 'x-api-key': 'k:s' }))
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts a valid credential and sets request.__workspace', async () => {
        mockService.findOneByActiveKey.mockResolvedValue({
            isActive: true,
            hash: 'H',
            startDate: new Date('2026-01-01Z'),
            endDate: new Date('2026-12-31Z'),
            workspace,
        });
        mockService.createHash.mockResolvedValue('HASHED');
        mockService.validateHash.mockResolvedValue(true);

        const c = ctx({ 'x-api-key': 'k:s' });
        await expect(guard.canActivate(c)).resolves.toBe(true);
        expect(c.__request.__workspace).toBe(workspace);
        expect(mockService.findOneByActiveKey).toHaveBeenCalledWith('k', {
            populate: ['workspace'],
        });
    });
});
