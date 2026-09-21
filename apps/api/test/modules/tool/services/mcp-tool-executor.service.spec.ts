import { Test } from '@nestjs/testing';
import { McpToolExecutorService } from 'src/modules/tool/services/mcp-tool-executor.service';
import { McpDiscoveryService } from 'src/modules/tool/services/mcp-discovery.service';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';

function makeTool(): ToolEntity {
    return {
        kind: ENUM_TOOL_KIND.MCP,
        mcpServerUrl: 'https://mcp.example.com/sse',
    } as unknown as ToolEntity;
}

describe('McpToolExecutorService', () => {
    let svc: McpToolExecutorService;
    const callTool = jest.fn();
    const close = jest.fn();
    const mockClient = { callTool, close };
    const mockDiscovery: any = {
        connect: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        mockDiscovery.connect.mockResolvedValue(mockClient);
        const mod = await Test.createTestingModule({
            providers: [
                McpToolExecutorService,
                { provide: McpDiscoveryService, useValue: mockDiscovery },
            ],
        }).compile();
        svc = mod.get(McpToolExecutorService);
    });

    it('calls Client.callTool with { name: actionName, arguments: args }', async () => {
        callTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

        await svc.execute(makeTool(), 'sendEmail', { to: 'a@b.c' });

        expect(callTool).toHaveBeenCalledWith({
            name: 'sendEmail',
            arguments: { to: 'a@b.c' },
        });
    });

    it('returns SUCCESS with result and durationMs on success', async () => {
        const content = [{ type: 'text', text: 'ok' }];
        callTool.mockResolvedValue({ content });

        const res = await svc.execute(makeTool(), 'sendEmail', {});

        expect(res.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
        expect(res.result).toEqual(content);
        expect(typeof res.durationMs).toBe('number');
        expect(res.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns ERROR with concatenated error text when result.isError is true', async () => {
        callTool.mockResolvedValue({
            isError: true,
            content: [
                { type: 'text', text: 'boom: ' },
                { type: 'text', text: 'bad request' },
            ],
        });

        const res = await svc.execute(makeTool(), 'sendEmail', {});

        expect(res.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
        expect(res.errorMessage).toBe('boom: bad request');
    });

    it('returns ERROR when connect throws', async () => {
        mockDiscovery.connect.mockRejectedValue(new Error('cannot connect'));

        const res = await svc.execute(makeTool(), 'sendEmail', {});

        expect(res.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
        expect(res.errorMessage).toMatch(/cannot connect/);
    });

    it('closes the client in finally even when callTool throws', async () => {
        callTool.mockRejectedValue(new Error('rpc failed'));

        const res = await svc.execute(makeTool(), 'sendEmail', {});

        expect(res.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
        expect(res.errorMessage).toMatch(/rpc failed/);
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('closes the client in finally on success', async () => {
        callTool.mockResolvedValue({ content: 'hi' });

        await svc.execute(makeTool(), 'sendEmail', {});

        expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not throw if close itself throws', async () => {
        callTool.mockResolvedValue({ content: 'hi' });
        close.mockRejectedValue(new Error('close failed'));

        const res = await svc.execute(makeTool(), 'sendEmail', {});

        expect(res.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
    });
});
