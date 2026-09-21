import { Test } from '@nestjs/testing';
import { ManifestBuilderService } from 'src/modules/tool/services/manifest-builder.service';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';

describe('ManifestBuilderService', () => {
    let svc: ManifestBuilderService;
    const mockRepo: any = {
        findEnabledByChatbotId: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const mod = await Test.createTestingModule({
            providers: [
                ManifestBuilderService,
                { provide: ChatbotToolRepository, useValue: mockRepo },
            ],
        }).compile();
        svc = mod.get(ManifestBuilderService);
    });

    it('returns [] when no enabled tools', async () => {
        mockRepo.findEnabledByChatbotId.mockResolvedValue([]);
        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toEqual([]);
        expect(mockRepo.findEnabledByChatbotId).toHaveBeenCalledWith(
            'cb-1',
            'ws-1'
        );
    });

    it('produces one ToolSpec for an enabled HTTP tool with slugified name and inputSchema from httpInputSchema', async () => {
        const tool = {
            id: 't-1',
            kind: ENUM_TOOL_KIND.HTTP,
            name: 'Get Weather Data!',
            slug: 'get_weather_data',
            description: 'Fetches current weather',
            deleted: false,
            httpInputSchema: {
                type: 'object',
                properties: { city: { type: 'string' } },
            },
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([{ tool }]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toHaveLength(1);
        expect(specs[0]).toEqual({
            id: 't-1',
            name: 'get_weather_data',
            description: 'Fetches current weather',
            inputSchema: {
                type: 'object',
                properties: { city: { type: 'string' } },
            },
        });
    });

    it('falls back to empty object schema when httpInputSchema is undefined', async () => {
        const tool = {
            id: 't-2',
            kind: ENUM_TOOL_KIND.HTTP,
            name: 'Ping',
            description: 'Ping endpoint',
            deleted: false,
            httpInputSchema: undefined,
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([{ tool }]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs[0].inputSchema).toEqual({
            type: 'object',
            properties: {},
        });
    });

    it('repo contract: only enabled+non-deleted chatbot-tool rows are returned by findEnabledByChatbotId (sanity)', async () => {
        // The repo filters out disabled rows; ManifestBuilder trusts that.
        mockRepo.findEnabledByChatbotId.mockResolvedValue([]);
        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toEqual([]);
        // We DO NOT pass disabled rows to the builder — the repo handles it.
    });

    it('excludes deleted tools even if a chatbot-tool row references them', async () => {
        const liveTool = {
            id: 't-live',
            kind: ENUM_TOOL_KIND.HTTP,
            name: 'Live',
            description: 'live',
            deleted: false,
            httpInputSchema: { type: 'object', properties: {} },
        };
        const deletedTool = {
            id: 't-del',
            kind: ENUM_TOOL_KIND.HTTP,
            name: 'Dead',
            description: 'dead',
            deleted: true,
            httpInputSchema: { type: 'object', properties: {} },
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([
            { tool: liveTool },
            { tool: deletedTool },
        ]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toHaveLength(1);
        expect(specs[0].id).toBe('t-live');
    });

    it('expands MCP tool into one ToolSpec per discovered action when enabledActions is null', async () => {
        const mcpTool = {
            id: 't-mcp',
            kind: ENUM_TOOL_KIND.MCP,
            name: 'Gmail',
            slug: 'gmail',
            description: 'Gmail MCP',
            deleted: false,
            discoveredActions: [
                {
                    name: 'send_email',
                    description: 'Send an email',
                    inputSchema: {
                        type: 'object',
                        properties: { to: { type: 'string' } },
                    },
                },
                {
                    name: 'list_inbox',
                    description: 'List inbox',
                    inputSchema: { type: 'object', properties: {} },
                },
            ],
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([
            { tool: mcpTool, enabledActions: null },
        ]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toHaveLength(2);
        expect(specs[0]).toEqual({
            id: 't-mcp:send_email',
            name: 'gmail__send_email',
            description: 'Send an email',
            inputSchema: {
                type: 'object',
                properties: { to: { type: 'string' } },
            },
        });
        expect(specs[1]).toEqual({
            id: 't-mcp:list_inbox',
            name: 'gmail__list_inbox',
            description: 'List inbox',
            inputSchema: { type: 'object', properties: {} },
        });
    });

    it('intersects discoveredActions with enabledActions when enabledActions is provided', async () => {
        const mcpTool = {
            id: 't-mcp',
            kind: ENUM_TOOL_KIND.MCP,
            name: 'Gmail',
            slug: 'gmail',
            description: 'Gmail MCP',
            deleted: false,
            discoveredActions: [
                {
                    name: 'action1',
                    description: 'A1',
                    inputSchema: { type: 'object' },
                },
                {
                    name: 'action2',
                    description: 'A2',
                    inputSchema: { type: 'object' },
                },
            ],
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([
            { tool: mcpTool, enabledActions: ['action1'] },
        ]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toHaveLength(1);
        expect(specs[0].id).toBe('t-mcp:action1');
        expect(specs[0].name).toBe('gmail__action1');
    });

    it('skips MCP tool with no discoveredActions', async () => {
        const mcpTool = {
            id: 't-mcp-empty',
            kind: ENUM_TOOL_KIND.MCP,
            name: 'Empty',
            description: 'Nothing discovered',
            deleted: false,
            discoveredActions: [],
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([
            { tool: mcpTool, enabledActions: null },
        ]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toEqual([]);
    });

    it('HTTP tool still produces 1 ToolSpec with id = tool.id (no colon)', async () => {
        const httpTool = {
            id: 't-http',
            kind: ENUM_TOOL_KIND.HTTP,
            name: 'http',
            description: 'http',
            deleted: false,
            httpInputSchema: { type: 'object', properties: {} },
        };
        mockRepo.findEnabledByChatbotId.mockResolvedValue([{ tool: httpTool }]);

        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toHaveLength(1);
        expect(specs[0].id).toBe('t-http');
        expect(specs[0].id).not.toContain(':');
    });

    it('skips rows where joined tool is missing', async () => {
        mockRepo.findEnabledByChatbotId.mockResolvedValue([
            { tool: null },
            { tool: undefined },
        ]);
        const specs = await svc.build('cb-1', 'ws-1');
        expect(specs).toEqual([]);
    });
});
