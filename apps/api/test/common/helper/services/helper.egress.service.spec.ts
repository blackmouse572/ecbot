import { ConfigService } from '@nestjs/config';
import {
    HelperEgressService,
    EgressBlockedError,
} from 'src/common/helper/services/helper.egress.service';

describe('HelperEgressService', () => {
    const mockCfg = { get: jest.fn(() => undefined) } as unknown as ConfigService;
    const buildService = () => new HelperEgressService(mockCfg);

    it('rejects a literal loopback IP before opening a socket', async () => {
        const service = buildService();
        await expect(service.fetch('http://127.0.0.1/steal')).rejects.toThrow(
            EgressBlockedError
        );
    });

    it('rejects a literal cloud-metadata IP', async () => {
        const service = buildService();
        await expect(
            service.fetch('http://169.254.169.254/latest/meta-data/')
        ).rejects.toThrow(EgressBlockedError);
    });

    it('rejects a bracketed literal IPv6 loopback', async () => {
        const service = buildService();
        await expect(service.fetch('http://[::1]/x')).rejects.toThrow(
            EgressBlockedError
        );
    });

    it('rejects a .internal hostname', async () => {
        const service = buildService();
        await expect(
            service.fetch('http://metadata.internal/x')
        ).rejects.toThrow(EgressBlockedError);
    });

    it('rejects a non-http(s) scheme', async () => {
        const service = buildService();
        await expect(service.fetch('file:///etc/passwd')).rejects.toThrow(
            EgressBlockedError
        );
    });

    it('rejects a domain name that resolves to a loopback address', async () => {
        const service = buildService();
        // "localhost" is not a literal IP, so this exercises the connect-time
        // DNS lookup hook rather than the literal-IP pre-check.
        await expect(service.fetch('http://localhost/x')).rejects.toThrow();
    });

    it('passes an allowed request through to fetch with the guard dispatcher and manual redirect', async () => {
        const service = buildService();
        const fetchSpy = jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));
        try {
            const res = await service.fetch('https://api.example.com/x');
            expect(res.status).toBe(200);
            const [calledUrl, init] = fetchSpy.mock.calls[0];
            expect(String(calledUrl)).toBe('https://api.example.com/x');
            // `dispatcher` is an undici fetch extension, not part of DOM's RequestInit —
            // production casts the same way when it sets this field.
            const typedInit = init as RequestInit & { dispatcher?: unknown };
            expect(typedInit.redirect).toBe('manual');
            expect(typedInit.dispatcher).toBeDefined();
        } finally {
            fetchSpy.mockRestore();
        }
    });

    describe('redirect handling', () => {
        it('rejects when a redirect points at a blocked address', async () => {
            const service = buildService();
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
                new Response(null, {
                    status: 302,
                    headers: {
                        location: 'http://169.254.169.254/latest/meta-data/',
                    },
                })
            );
            try {
                await expect(
                    service.fetch('https://api.example.com/x')
                ).rejects.toThrow(EgressBlockedError);
                // the second hop must never be attempted
                expect(fetchSpy).toHaveBeenCalledTimes(1);
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('rejects after exceeding the redirect hop cap', async () => {
            const service = buildService();
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockImplementation(
                    async () =>
                        new Response(null, {
                            status: 302,
                            headers: { location: 'https://example.com/next' },
                        })
                );
            try {
                await expect(
                    service.fetch('https://example.com/start')
                ).rejects.toThrow(/too many redirects/i);
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('strips Metadata-* and hop-by-hop headers on the initial request', async () => {
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const service = buildService();
            try {
                await service.fetch('https://example.com/x', {
                    headers: {
                        'Metadata-Flavor': 'Google',
                        Connection: 'keep-alive',
                        'X-Trace-Id': 'abc',
                    },
                });
                const [, init] = fetchSpy.mock.calls[0];
                const headers = init!.headers as Record<string, string>;
                expect(headers['Metadata-Flavor']).toBeUndefined();
                expect(headers.Connection).toBeUndefined();
                expect(headers['X-Trace-Id']).toBe('abc');
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('preserves Authorization on the initial request', async () => {
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const service = buildService();
            try {
                await service.fetch('https://example.com/x', {
                    headers: { Authorization: 'Bearer secret' },
                });
                const [, init] = fetchSpy.mock.calls[0];
                const headers = init!.headers as Record<string, string>;
                expect(headers.Authorization).toBe('Bearer secret');
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('strips Authorization when a redirect crosses origin', async () => {
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 302,
                        headers: { location: 'https://attacker.example/collect' },
                    })
                )
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const service = buildService();
            try {
                await service.fetch('https://api.example.com/x', {
                    headers: { Authorization: 'Bearer secret' },
                });
                const [, secondInit] = fetchSpy.mock.calls[1];
                const headers = secondInit!.headers as Record<string, string>;
                expect(headers.Authorization).toBeUndefined();
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('preserves Authorization when a redirect stays same-origin', async () => {
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 302,
                        headers: { location: 'https://api.example.com/y' },
                    })
                )
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const service = buildService();
            try {
                await service.fetch('https://api.example.com/x', {
                    headers: { Authorization: 'Bearer secret' },
                });
                const [, secondInit] = fetchSpy.mock.calls[1];
                const headers = secondInit!.headers as Record<string, string>;
                expect(headers.Authorization).toBe('Bearer secret');
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('switches a POST redirected by 303 to GET and drops the body', async () => {
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 303,
                        headers: { location: 'https://api.example.com/y' },
                    })
                )
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const service = buildService();
            try {
                await service.fetch('https://api.example.com/x', {
                    method: 'POST',
                    body: JSON.stringify({ a: 1 }),
                });
                const [, secondInit] = fetchSpy.mock.calls[1];
                expect(secondInit!.method).toBe('GET');
                expect(secondInit!.body).toBeUndefined();
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('preserves method and body on a 307 redirect', async () => {
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 307,
                        headers: { location: 'https://api.example.com/y' },
                    })
                )
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const service = buildService();
            try {
                await service.fetch('https://api.example.com/x', {
                    method: 'POST',
                    body: JSON.stringify({ a: 1 }),
                });
                const [, secondInit] = fetchSpy.mock.calls[1];
                expect(secondInit!.method).toBe('POST');
                expect(secondInit!.body).toBe(JSON.stringify({ a: 1 }));
            } finally {
                fetchSpy.mockRestore();
            }
        });
    });

    describe('response size cap', () => {
        function bodyOfBytes(n: number): ReadableStream<Uint8Array> {
            return new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(n));
                    controller.close();
                },
            });
        }

        it('rejects a response over the configured cap', async () => {
            const cfg = {
                get: jest.fn((key: string) =>
                    key === 'helper.egress.maxResponseBytes' ? 10 : undefined
                ),
            } as unknown as ConfigService;
            const service = new HelperEgressService(cfg);
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(bodyOfBytes(20), { status: 200 })
                );
            try {
                const res = await service.fetch('https://example.com/x');
                await expect(res.arrayBuffer()).rejects.toThrow(
                    EgressBlockedError
                );
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('allows a response under the configured cap', async () => {
            const cfg = {
                get: jest.fn((key: string) =>
                    key === 'helper.egress.maxResponseBytes' ? 100 : undefined
                ),
            } as unknown as ConfigService;
            const service = new HelperEgressService(cfg);
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(bodyOfBytes(20), { status: 200 })
                );
            try {
                const res = await service.fetch('https://example.com/x');
                const buf = await res.arrayBuffer();
                expect(buf.byteLength).toBe(20);
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('passes a bodyless response through unchanged', async () => {
            const service = buildService();
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(new Response(null, { status: 204 }));
            try {
                const res = await service.fetch('https://example.com/x');
                expect(res.status).toBe(204);
            } finally {
                fetchSpy.mockRestore();
            }
        });

        it('falls back to the 5 MB default when unconfigured', async () => {
            const service = buildService(); // mockCfg.get always returns undefined
            const fetchSpy = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(
                    new Response(bodyOfBytes(1000), { status: 200 })
                );
            try {
                const res = await service.fetch('https://example.com/x');
                const buf = await res.arrayBuffer();
                expect(buf.byteLength).toBe(1000);
            } finally {
                fetchSpy.mockRestore();
            }
        });
    });
});
