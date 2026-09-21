import * as dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agent, buildConnector } from 'undici';
import {
    isDisallowedAddress,
    isDisallowedHostname,
    parseLiteralAddress,
} from 'src/common/utils/egress-blocklist.util';
import { IHelperEgressService } from 'src/common/helper/interfaces/helper.egress-service.interface';

export class EgressBlockedError extends Error {}

const MAX_REDIRECTS = 5;

const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
]);

const CREDENTIAL_HEADERS = new Set(['authorization', 'cookie']);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * net.connect() (and so undici's connector) requests `{ all: true }` for
 * Happy-Eyeballs-style dual-stack resolution, so dns.lookup's callback can
 * hand back either a single address or an array of candidates — both
 * shapes must be validated, not just the single-address one.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
    dns.lookup(hostname, options, (err, address, family) => {
        if (err) {
            callback(err, '', 0);
            return;
        }
        if (Array.isArray(address)) {
            const safe = address.filter(
                candidate =>
                    !isDisallowedAddress(
                        candidate.address,
                        candidate.family as 4 | 6
                    )
            );
            if (safe.length === 0) {
                callback(
                    new EgressBlockedError(
                        `Egress blocked: no allowed address resolved for ${hostname}`
                    ),
                    [],
                    undefined
                );
                return;
            }
            callback(null, safe, undefined as unknown as number);
            return;
        }
        if (isDisallowedAddress(address, family as 4 | 6)) {
            callback(
                new EgressBlockedError(
                    `Egress blocked: resolved address ${address} is not allowed`
                ),
                '',
                0
            );
            return;
        }
        callback(null, address, family);
    });
};

function originOf(url: URL): string {
    return `${url.protocol}//${url.host}`;
}

/**
 * Normalizes any HeadersInit shape into a plain object, dropping
 * Metadata- and hop-by-hop headers always and credential headers when
 * `stripCredentials` is set. Preserves original header-name casing for
 * plain-object/array input (the two shapes this app's own call sites use)
 * — a `Headers` instance input is iterated in its own (lowercase) form.
 */
function stripHeaders(
    headers: HeadersInit | undefined,
    stripCredentials: boolean
): Record<string, string> {
    const entries: Array<[string, string]> =
        headers instanceof Headers
            ? Array.from(headers.entries())
            : Array.isArray(headers)
              ? headers
              : Object.entries(headers ?? {});

    const result: Record<string, string> = {};
    for (const [key, value] of entries) {
        const lower = key.toLowerCase();
        if (lower.startsWith('metadata-')) continue;
        if (HOP_BY_HOP_HEADERS.has(lower)) continue;
        if (stripCredentials && CREDENTIAL_HEADERS.has(lower)) continue;
        result[key] = value;
    }
    return result;
}

/** WHATWG fetch redirect semantics: 303 always becomes GET; 301/302 become
 * GET only for a non-GET/HEAD method; 307/308 always preserve the method. */
function methodForRedirect(status: number, method: string): string {
    if (status === 303) return 'GET';
    if (
        (status === 301 || status === 302) &&
        method !== 'GET' &&
        method !== 'HEAD'
    ) {
        return 'GET';
    }
    return method;
}

function capResponseSize(res: Response, maxBytes: number): Response {
    if (!res.body) return res;
    let received = 0;
    const capped = res.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                received += chunk.byteLength;
                if (received > maxBytes) {
                    controller.error(
                        new EgressBlockedError(
                            `Egress blocked: response exceeded ${maxBytes} bytes`
                        )
                    );
                    return;
                }
                controller.enqueue(chunk);
            },
        })
    );
    return new Response(capped, res);
}

@Injectable()
export class HelperEgressService implements IHelperEgressService {
    private readonly agent: Agent;

    constructor(private readonly cfg: ConfigService) {
        this.agent = new Agent({
            connect: buildConnector({ lookup: safeLookup }),
        });
    }

    async fetch(url: string | URL, init: RequestInit = {}): Promise<Response> {
        const res = await this.guardedFetch(new URL(url), init, 0);
        return capResponseSize(res, this.maxResponseBytes());
    }

    private maxResponseBytes(): number {
        return (
            this.cfg.get<number>('helper.egress.maxResponseBytes') ??
            5_000_000
        );
    }

    private async guardedFetch(
        url: URL,
        init: RequestInit,
        redirectCount: number
    ): Promise<Response> {
        this.assertAllowedScheme(url);
        this.assertAllowedHost(url);

        const headers = stripHeaders(init.headers, false);
        const res = await fetch(url, {
            ...init,
            headers,
            redirect: 'manual',
            dispatcher: this.agent,
        } as RequestInit);

        const location = res.headers.get('location');
        if (REDIRECT_STATUSES.has(res.status) && location) {
            if (redirectCount >= MAX_REDIRECTS) {
                throw new EgressBlockedError(
                    'Egress blocked: too many redirects'
                );
            }
            const nextUrl = new URL(location, url);
            const crossOrigin = originOf(nextUrl) !== originOf(url);
            const nextMethod = methodForRedirect(res.status, init.method ?? 'GET');
            const nextInit: RequestInit = {
                ...init,
                method: nextMethod,
                body: nextMethod === 'GET' ? undefined : init.body,
                headers: stripHeaders(headers, crossOrigin),
            };
            return this.guardedFetch(nextUrl, nextInit, redirectCount + 1);
        }

        return res;
    }

    private assertAllowedScheme(url: URL): void {
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new EgressBlockedError(
                `Egress blocked: scheme ${url.protocol} is not allowed`
            );
        }
    }

    private assertAllowedHost(url: URL): void {
        if (isDisallowedHostname(url.hostname)) {
            throw new EgressBlockedError(
                `Egress blocked: host ${url.hostname} is not allowed`
            );
        }
        const literal = parseLiteralAddress(url.hostname);
        if (literal && isDisallowedAddress(literal.address, literal.family)) {
            throw new EgressBlockedError(
                `Egress blocked: address ${literal.address} is not allowed`
            );
        }
    }
}
