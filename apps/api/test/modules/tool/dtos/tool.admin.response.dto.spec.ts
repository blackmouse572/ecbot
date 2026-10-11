import { plainToInstance } from 'class-transformer';
import { ToolAdminResponseDto } from 'src/modules/tool/dtos/response/tool.admin.response.dto';

describe('ToolAdminResponseDto', () => {
    const dto = plainToInstance(
        ToolAdminResponseDto,
        {
            id: 't-1',
            displayName: 'Orders',
            workspace: { id: 'ws-1', name: 'Shop A', billingEmail: 'a@b.c' },
            httpHeaders: { 'X-Secret': 'customer-secret' },
            httpCredential: 'v1:enc:token',
            mcpCredential: 'v1:enc:token',
            invocationStats: {
                total: 3,
                success: 2,
                error: 1,
                timeout: 0,
                lastInvokedAt: null,
            },
        },
        { excludeExtraneousValues: true }
    );

    it('names the owning workspace and nothing else about it', () => {
        expect(dto.workspace).toEqual({ id: 'ws-1', name: 'Shop A' });
    });

    it('carries the invocation stats', () => {
        expect(dto.invocationStats.total).toBe(3);
    });

    it('keeps header values and credentials away from admins', () => {
        const json = JSON.stringify(dto);
        expect(json).not.toContain('customer-secret');
        expect(json).not.toContain('v1:enc:token');
    });
});
