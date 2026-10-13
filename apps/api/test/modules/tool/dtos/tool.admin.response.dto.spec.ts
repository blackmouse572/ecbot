import { plainToInstance } from 'class-transformer';
import {
    ToolAdminListResponseDto,
    ToolAdminResponseDto,
} from 'src/modules/tool/dtos/response/tool.admin.response.dto';

describe('ToolAdminResponseDto', () => {
    const dto = plainToInstance(
        ToolAdminResponseDto,
        {
            id: 't-1',
            displayName: 'Orders',
            workspace: { id: 'ws-1', name: 'Shop A', billingEmail: 'a@b.c' },
            httpHeaders: { 'X-Secret': 'customer-secret' },
            httpUrl:
                'https://user:pw@api.shop.vn/v1/orders?token=url-secret#frag',
            mcpServerUrl: 'https://mcp.composio.dev/server/abc?user_id=u-42',
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

    // #253 review: a URL can hold a secret in its query, and Composio URLs
    // carry ?user_id=.
    it('shows URLs without their query string, fragment or login', () => {
        expect(dto.httpUrl).toBe('https://api.shop.vn/v1/orders');
        expect(dto.mcpServerUrl).toBe('https://mcp.composio.dev/server/abc');
    });

    it('leaves out a URL it cannot parse', () => {
        const odd = plainToInstance(
            ToolAdminResponseDto,
            { id: 't-1', httpUrl: 'not a url?token=url-secret' },
            { excludeExtraneousValues: true }
        );
        expect(odd.httpUrl).toBeUndefined();
        expect(odd.mcpServerUrl).toBeUndefined();
    });
});

describe('ToolAdminListResponseDto', () => {
    const [dto] = plainToInstance(
        ToolAdminListResponseDto,
        [
            {
                id: 't-1',
                workspace: { id: 'ws-1', name: 'Shop A' },
                httpHeaders: { 'X-Secret': 'customer-secret' },
                httpUrl: 'https://api.shop.vn/v1/orders?token=url-secret',
                mcpServerUrl:
                    'https://mcp.composio.dev/server/abc?user_id=u-42',
            },
        ],
        { excludeExtraneousValues: true }
    );

    it('keeps header values away from admins', () => {
        expect(dto).not.toHaveProperty('httpHeaders');
        expect(JSON.stringify(dto)).not.toContain('customer-secret');
    });

    it('shows URLs without their query string', () => {
        expect(dto.httpUrl).toBe('https://api.shop.vn/v1/orders');
        expect(dto.mcpServerUrl).toBe('https://mcp.composio.dev/server/abc');
    });
});
