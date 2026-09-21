import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperEgressService } from 'src/common/helper/services/helper.egress.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { McpDiscoveryService } from 'src/modules/tool/services/mcp-discovery.service';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => {
    const connect = jest.fn();
    const listTools = jest.fn();
    const close = jest.fn();
    const Client = jest.fn().mockImplementation(() => ({
        connect,
        listTools,
        close,
    }));
    return {
        Client,
        __mocks: { Client, connect, listTools, close },
    };
});

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
    const StreamableHTTPClientTransport = jest
        .fn()
        .mockImplementation((url: URL, opts: unknown) => ({
            __url: url,
            __opts: opts,
        }));
    return {
        StreamableHTTPClientTransport,
        __mocks: { StreamableHTTPClientTransport },
    };
});

/* eslint-disable @typescript-eslint/no-require-imports */
const clientMocks = (
    require('@modelcontextprotocol/sdk/client/index.js') as any
).__mocks as {
    Client: jest.Mock;
    connect: jest.Mock;
    listTools: jest.Mock;
    close: jest.Mock;
};
const transportMocks = (
    require('@modelcontextprotocol/sdk/client/streamableHttp.js') as any
).__mocks as { StreamableHTTPClientTransport: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */

function makeTool(overrides: Partial<ToolEntity> = {}): ToolEntity {
    const base: any = {
        kind: ENUM_TOOL_KIND.MCP,
        mcpServerUrl: 'https://mcp.example.com/sse',
        ...overrides,
    };
    return base as ToolEntity;
}

describe('McpDiscoveryService', () => {
    let svc: McpDiscoveryService;
    const mockEnc: any = {
        envelopeDecrypt: jest.fn((v: string) => `plain:${v}`),
    };
    const mockCfg: any = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const mod = await Test.createTestingModule({
            providers: [
                McpDiscoveryService,
                { provide: HelperEncryptionService, useValue: mockEnc },
                { provide: ConfigService, useValue: mockCfg },
                HelperEgressService,
            ],
        }).compile();
        svc = mod.get(McpDiscoveryService);
    });

    it('discover returns actions mapped to { name, description, inputSchema }', async () => {
        clientMocks.listTools.mockResolvedValue({
            tools: [
                {
                    name: 'sendEmail',
                    description: 'Send an email',
                    inputSchema: {
                        type: 'object',
                        properties: { to: { type: 'string' } },
                    },
                },
                { name: 'noDesc', inputSchema: { type: 'object' } },
            ],
        });

        const actions = await svc.discover(makeTool());

        expect(actions).toEqual([
            {
                name: 'sendEmail',
                description: 'Send an email',
                inputSchema: {
                    type: 'object',
                    properties: { to: { type: 'string' } },
                },
            },
            {
                name: 'noDesc',
                description: '',
                inputSchema: { type: 'object' },
            },
        ]);
    });

    it('sets bearer Authorization header in transport requestInit when mcpAuth.type === "bearer"', async () => {
        clientMocks.listTools.mockResolvedValue({ tools: [] });
        const tool = makeTool({
            mcpAuth: { type: 'bearer' },
            mcpCredential: 'enc-token',
        });

        await svc.discover(tool);

        expect(mockEnc.envelopeDecrypt).toHaveBeenCalledWith('enc-token');
        expect(
            transportMocks.StreamableHTTPClientTransport
        ).toHaveBeenCalledTimes(1);
        const [, opts] =
            transportMocks.StreamableHTTPClientTransport.mock.calls[0];
        expect((opts as any).requestInit.headers).toEqual({
            Authorization: 'Bearer plain:enc-token',
        });
    });

    it('sets api_key header using configured paramName', async () => {
        clientMocks.listTools.mockResolvedValue({ tools: [] });
        const tool = makeTool({
            mcpAuth: {
                type: 'api_key',
                placement: 'header',
                paramName: 'X-My-Key',
            },
            mcpCredential: 'enc-key',
        });

        await svc.discover(tool);

        const [, opts] =
            transportMocks.StreamableHTTPClientTransport.mock.calls[0];
        expect((opts as any).requestInit.headers).toEqual({
            'X-My-Key': 'plain:enc-key',
        });
    });

    it('defaults api_key header name to X-API-Key when paramName missing', async () => {
        clientMocks.listTools.mockResolvedValue({ tools: [] });
        const tool = makeTool({
            mcpAuth: { type: 'api_key' },
            mcpCredential: 'enc-key',
        });

        await svc.discover(tool);

        const [, opts] =
            transportMocks.StreamableHTTPClientTransport.mock.calls[0];
        expect((opts as any).requestInit.headers).toEqual({
            'X-API-Key': 'plain:enc-key',
        });
    });

    it('omits Authorization header when mcpAuth.type === "none" or undefined', async () => {
        clientMocks.listTools.mockResolvedValue({ tools: [] });

        await svc.discover(makeTool({ mcpAuth: { type: 'none' } }));
        const [, opts1] =
            transportMocks.StreamableHTTPClientTransport.mock.calls[0];
        expect((opts1 as any).requestInit.headers).toEqual({});

        transportMocks.StreamableHTTPClientTransport.mockClear();
        await svc.discover(makeTool());
        const [, opts2] =
            transportMocks.StreamableHTTPClientTransport.mock.calls[0];
        expect((opts2 as any).requestInit.headers).toEqual({});
    });

    it('closes the client even if listTools throws', async () => {
        clientMocks.listTools.mockRejectedValue(new Error('boom'));

        await expect(svc.discover(makeTool())).rejects.toThrow('boom');
        expect(clientMocks.close).toHaveBeenCalledTimes(1);
    });

    it('throws when tool.mcpServerUrl is missing', async () => {
        const tool = makeTool({ mcpServerUrl: undefined });
        await expect(svc.discover(tool)).rejects.toThrow(/mcpServerUrl/);
    });

    it('passes a bound egress-guard fetch to the transport options', async () => {
        clientMocks.listTools.mockResolvedValue({ tools: [] });

        await svc.discover(makeTool());

        const [, opts] =
            transportMocks.StreamableHTTPClientTransport.mock.calls[0];
        expect(typeof (opts as any).fetch).toBe('function');
    });
});
