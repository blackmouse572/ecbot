import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpToolExecutorService } from 'src/modules/tool/services/http-tool-executor.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperEgressService } from 'src/common/helper/services/helper.egress.service';
import {
    ENUM_HTTP_METHOD,
    ToolEntity,
} from 'src/modules/tool/repository/entities/tool.entity';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';

type MutableTool = Partial<ToolEntity> & { kind: ENUM_TOOL_KIND };

function makeTool(overrides: Partial<ToolEntity> = {}): ToolEntity {
    const base: MutableTool = {
        kind: ENUM_TOOL_KIND.HTTP,
        httpMethod: ENUM_HTTP_METHOD.POST,
        httpUrl: 'https://api.example.com/x',
        timeoutMs: 10000,
        maxRetries: 0,
        ...overrides,
    };
    return base as ToolEntity;
}

function jsonResponse(status: number, body: unknown): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers(),
        text: async () =>
            typeof body === 'string' ? body : JSON.stringify(body),
    } as unknown as Response;
}

describe('HttpToolExecutorService', () => {
    let svc: HttpToolExecutorService;
    const mockEnc: any = {
        envelopeDecrypt: jest.fn((c: string) => `decrypted-${c}`),
    };
    const mockCfg: any = { get: jest.fn(() => undefined) };
    let fetchSpy: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();
        const mod = await Test.createTestingModule({
            providers: [
                HttpToolExecutorService,
                { provide: HelperEncryptionService, useValue: mockEnc },
                HelperEgressService,
                { provide: ConfigService, useValue: mockCfg },
            ],
        }).compile();
        svc = mod.get(HttpToolExecutorService);
        fetchSpy = jest.spyOn(global, 'fetch' as any);
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('adds Bearer Authorization header for bearer auth', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
        const tool = makeTool({
            httpAuth: { type: 'bearer' },
            httpCredential: 'cipher-token',
        });
        const result = await svc.execute(tool, { x: 1 });
        const [, init] = fetchSpy.mock.calls[0];
        expect((init.headers as Record<string, string>).Authorization).toBe(
            'Bearer decrypted-cipher-token'
        );
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
    });

    it('appends api_key in query string when placement=query', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpAuth: {
                type: 'api_key',
                placement: 'query',
                paramName: 'apikey',
            },
            httpCredential: 'cipher-q',
            httpMethod: ENUM_HTTP_METHOD.GET,
        });
        await svc.execute(tool, {});
        const [url] = fetchSpy.mock.calls[0];
        expect(String(url)).toContain('apikey=decrypted-cipher-q');
    });

    it('appends api_key in query with & when url already has ?', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpUrl: 'https://api.example.com/x?foo=bar',
            httpAuth: {
                type: 'api_key',
                placement: 'query',
                paramName: 'apikey',
            },
            httpCredential: 'cipher-q',
            httpMethod: ENUM_HTTP_METHOD.GET,
        });
        await svc.execute(tool, {});
        const [url] = fetchSpy.mock.calls[0];
        expect(String(url)).toContain('&apikey=decrypted-cipher-q');
    });

    it('sets api_key as header when placement=header', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpAuth: {
                type: 'api_key',
                placement: 'header',
                paramName: 'X-Custom-Key',
            },
            httpCredential: 'cipher-h',
        });
        await svc.execute(tool, {});
        const [, init] = fetchSpy.mock.calls[0];
        expect((init.headers as Record<string, string>)['X-Custom-Key']).toBe(
            'decrypted-cipher-h'
        );
    });

    it('sets Basic Authorization header with base64 for basic auth', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpAuth: { type: 'basic' },
            httpCredential: 'user:pass',
        });
        await svc.execute(tool, {});
        const [, init] = fetchSpy.mock.calls[0];
        const expected = `Basic ${Buffer.from('decrypted-user:pass').toString('base64')}`;
        expect((init.headers as Record<string, string>).Authorization).toBe(
            expected
        );
    });

    it('does not add Authorization when auth type is none', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpAuth: { type: 'none' },
        });
        await svc.execute(tool, {});
        const [, init] = fetchSpy.mock.calls[0];
        expect(
            (init.headers as Record<string, string>).Authorization
        ).toBeUndefined();
        expect(mockEnc.envelopeDecrypt).not.toHaveBeenCalled();
    });

    it('returns SUCCESS with parsed JSON body for 2xx response', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, { foo: 'bar' }));
        const tool = makeTool();
        const result = await svc.execute(tool, { a: 1 });
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
        expect(result.result).toEqual({ foo: 'bar' });
        expect(typeof result.durationMs).toBe('number');
    });

    it('returns ERROR with errorMessage on 4xx response', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(400, { error: 'bad' }));
        const tool = makeTool();
        const result = await svc.execute(tool, {});
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
        expect(result.errorMessage).toContain('400');
    });

    it('returns TIMEOUT when AbortController aborts', async () => {
        fetchSpy.mockImplementationOnce((_url: string, init: RequestInit) => {
            return new Promise((_resolve, reject) => {
                const signal = init.signal as AbortSignal;
                signal.addEventListener('abort', () => {
                    const err: any = new Error('aborted');
                    err.name = 'AbortError';
                    reject(err);
                });
            });
        });
        const tool = makeTool({ timeoutMs: 10 });
        const result = await svc.execute(tool, {});
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.TIMEOUT);
        expect(result.errorMessage).toBe('timeout');
    });

    it('retries on network error and fails after maxRetries attempts', async () => {
        fetchSpy
            .mockRejectedValueOnce(new Error('econnreset'))
            .mockRejectedValueOnce(new Error('econnreset'));
        const tool = makeTool({ maxRetries: 1 });
        const result = await svc.execute(tool, {});
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
    });

    it('merges custom non-secret headers from tool.httpHeaders', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpHeaders: { 'X-Trace-Id': 'abc', 'X-App': 'eccho' },
        });
        await svc.execute(tool, {});
        const [, init] = fetchSpy.mock.calls[0];
        const headers = init.headers as Record<string, string>;
        expect(headers['X-Trace-Id']).toBe('abc');
        expect(headers['X-App']).toBe('eccho');
        expect(headers['Content-Type']).toBe('application/json');
    });

    it('does not send a body for GET requests', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({ httpMethod: ENUM_HTTP_METHOD.GET });
        await svc.execute(tool, { a: 1 });
        const [, init] = fetchSpy.mock.calls[0];
        expect(init.body).toBeUndefined();
    });

    it('sends GET arguments as the query string (#232)', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpMethod: ENUM_HTTP_METHOD.GET,
            httpUrl: 'https://api.example.com/stock',
        });
        await svc.execute(tool, { item: 'floral dress', size: 'L' });
        const [url] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe(
            'https://api.example.com/stock?item=floral+dress&size=L'
        );
    });

    it('sends DELETE arguments as the query string, JSON-encoding objects', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpMethod: ENUM_HTTP_METHOD.DELETE,
            httpUrl: 'https://api.example.com/orders?v=2',
        });
        await svc.execute(tool, { id: 7, tags: ['a'], skip: undefined });
        const [url, init] = fetchSpy.mock.calls[0];
        expect(new URL(url).searchParams.get('v')).toBe('2');
        expect(new URL(url).searchParams.get('id')).toBe('7');
        expect(new URL(url).searchParams.get('tags')).toBe('["a"]');
        expect(new URL(url).searchParams.has('skip')).toBe(false);
        expect(init.body).toBeUndefined();
    });

    it('never lets an argument replace the query API key', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpMethod: ENUM_HTTP_METHOD.GET,
            httpUrl: 'https://api.example.com/stock',
            httpAuth: {
                type: 'api_key',
                placement: 'query',
                paramName: 'api_key',
            },
            httpCredential: 'cipher',
        });
        await svc.execute(tool, { api_key: 'attacker', item: 'dress' });
        const params = new URL(String(fetchSpy.mock.calls[0][0])).searchParams;
        expect(params.getAll('api_key')).toEqual(['decrypted-cipher']);
        expect(params.get('item')).toBe('dress');
    });

    it("never lets an argument replace a parameter fixed in the tool's URL", async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpMethod: ENUM_HTTP_METHOD.GET,
            httpUrl: 'https://api.example.com/orders?shop_id=123',
        });
        await svc.execute(tool, { shop_id: '999', status: 'open' });
        const params = new URL(String(fetchSpy.mock.calls[0][0])).searchParams;
        expect(params.getAll('shop_id')).toEqual(['123']);
        expect(params.get('status')).toBe('open');
    });

    it('sends booleans as true/false and keeps a URL fragment out of the query', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpMethod: ENUM_HTTP_METHOD.GET,
            httpUrl: 'https://api.example.com/stock#top',
        });
        await svc.execute(tool, { inStock: true, sale: false });
        const url = new URL(String(fetchSpy.mock.calls[0][0]));
        expect(url.searchParams.get('inStock')).toBe('true');
        expect(url.searchParams.get('sale')).toBe('false');
        expect(url.hash).toBe('#top');
    });

    it('returns an error result, not a throw, for a URL it cannot parse', async () => {
        const result = await svc.executeWithConfig(
            { httpMethod: 'GET', httpUrl: 'api.example.com/stock' },
            { item: 'dress' }
        );
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
    });

    it.each(['API_KEY', 'api_key[]', 'Api_Key[0]'])(
        'never lets an argument named %s slip past the query API key',
        async name => {
            fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
            const tool = makeTool({
                httpMethod: ENUM_HTTP_METHOD.GET,
                httpUrl: 'https://api.example.com/stock',
                httpAuth: {
                    type: 'api_key',
                    placement: 'query',
                    paramName: 'api_key',
                },
                httpCredential: 'cipher',
            });
            await svc.execute(tool, { [name]: 'attacker', item: 'dress' });
            const url = String(fetchSpy.mock.calls[0][0]);
            expect(url).not.toContain('attacker');
            expect(url).toContain('item=dress');
        }
    );

    it("sends the tool URL's own parameters exactly as written", async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({
            httpMethod: ENUM_HTTP_METHOD.POST,
            httpUrl: 'https://api.example.com/x?q=a%20b&flag',
            httpAuth: { type: 'api_key', placement: 'query', paramName: 'key' },
            httpCredential: 'cipher',
        });
        await svc.execute(tool, { a: 1 });
        expect(String(fetchSpy.mock.calls[0][0])).toBe(
            'https://api.example.com/x?q=a%20b&flag&key=decrypted-cipher'
        );
    });

    it('sends GET arguments as the query string when testing a config', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        await svc.executeWithConfig(
            { httpMethod: 'GET', httpUrl: 'https://api.example.com/stock' },
            { item: 'dress' }
        );
        const [url] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe('https://api.example.com/stock?item=dress');
    });

    it('sends JSON-stringified args as body for POST requests', async () => {
        fetchSpy.mockResolvedValueOnce(jsonResponse(200, {}));
        const tool = makeTool({ httpMethod: ENUM_HTTP_METHOD.POST });
        await svc.execute(tool, { foo: 'bar', n: 42 });
        const [, init] = fetchSpy.mock.calls[0];
        expect(init.body).toBe(JSON.stringify({ foo: 'bar', n: 42 }));
    });

    it('returns ERROR status when the tool URL points at a loopback address', async () => {
        const tool = makeTool({ httpUrl: 'http://127.0.0.1/steal' });
        const result = await svc.execute(tool, {});
        expect(result.status).toBe(ENUM_TOOL_INVOCATION_STATUS.ERROR);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
