import { Injectable, Logger } from '@nestjs/common';
import { HelperEgressService } from 'src/common/helper/services/helper.egress.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';

export interface ExecutionResult {
    status: ENUM_TOOL_INVOCATION_STATUS;
    result?: unknown;
    errorMessage?: string;
    durationMs: number;
}

@Injectable()
export class HttpToolExecutorService {
    private readonly logger = new Logger(HttpToolExecutorService.name);

    constructor(
        private readonly enc: HelperEncryptionService,
        private readonly egress: HelperEgressService
    ) {}

    async execute(
        tool: ToolEntity,
        args: Record<string, unknown>
    ): Promise<ExecutionResult> {
        const started = Date.now();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(tool.httpHeaders ?? {}),
        };
        let url = tool.httpUrl!;

        if (
            tool.httpAuth &&
            tool.httpAuth.type !== 'none' &&
            tool.httpCredential
        ) {
            const plain = this.enc.envelopeDecrypt(tool.httpCredential);
            switch (tool.httpAuth.type) {
                case 'bearer':
                    headers['Authorization'] = `Bearer ${plain}`;
                    break;
                case 'api_key':
                    if (tool.httpAuth.placement === 'header') {
                        headers[tool.httpAuth.paramName ?? 'X-API-Key'] = plain;
                    } else {
                        const sep = url.includes('?') ? '&' : '?';
                        const param = tool.httpAuth.paramName ?? 'api_key';
                        url += `${sep}${encodeURIComponent(param)}=${encodeURIComponent(plain)}`;
                    }
                    break;
                case 'basic':
                    headers['Authorization'] =
                        `Basic ${Buffer.from(plain).toString('base64')}`;
                    break;
            }
        }

        const method = tool.httpMethod ?? 'POST';
        const init: RequestInit = {
            method,
            headers,
            body: ['GET', 'DELETE'].includes(method)
                ? undefined
                : JSON.stringify(args),
        };

        const attempts = tool.maxRetries ?? 1;
        let lastErr: string | undefined;
        let isTimeout = false;
        for (let i = 0; i <= attempts; i++) {
            const controller = new AbortController();
            const timer = setTimeout(
                () => controller.abort(),
                tool.timeoutMs ?? 10000
            );
            try {
                const res = await this.egress.fetch(url, {
                    ...init,
                    signal: controller.signal,
                });
                clearTimeout(timer);
                const body = await res.text();
                const parsed = body ? this.tryParse(body) : undefined;
                if (res.ok) {
                    return {
                        status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
                        result: parsed,
                        durationMs: Date.now() - started,
                    };
                }
                const errorMsg = `HTTP ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`;
                // Fail fast on client errors; retry transient server errors
                if (res.status >= 400 && res.status < 500) {
                    return {
                        status: ENUM_TOOL_INVOCATION_STATUS.ERROR,
                        errorMessage: errorMsg,
                        durationMs: Date.now() - started,
                    };
                }
                lastErr = errorMsg;
                isTimeout = false;
            } catch (err: any) {
                clearTimeout(timer);
                if (err?.name === 'AbortError') {
                    lastErr = 'timeout';
                    isTimeout = true;
                } else {
                    lastErr = err instanceof Error ? err.message : String(err);
                    isTimeout = false;
                }
            }
        }
        return {
            status: isTimeout
                ? ENUM_TOOL_INVOCATION_STATUS.TIMEOUT
                : ENUM_TOOL_INVOCATION_STATUS.ERROR,
            errorMessage: lastErr,
            durationMs: Date.now() - started,
        };
    }

    async executeWithConfig(
        config: {
            httpMethod?: string;
            httpUrl: string;
            httpHeaders?: Record<string, string>;
            httpAuth?: { type: string; placement?: string; paramName?: string };
            plaintextCredential?: string;
            timeoutMs?: number;
            maxRetries?: number;
        },
        args: Record<string, unknown>
    ): Promise<ExecutionResult> {
        const started = Date.now();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(config.httpHeaders ?? {}),
        };
        let url = config.httpUrl;

        if (
            config.httpAuth &&
            config.httpAuth.type !== 'none' &&
            config.plaintextCredential
        ) {
            const plain = config.plaintextCredential;
            switch (config.httpAuth.type) {
                case 'bearer':
                    headers['Authorization'] = `Bearer ${plain}`;
                    break;
                case 'api_key':
                    if (config.httpAuth.placement === 'header') {
                        headers[config.httpAuth.paramName ?? 'X-API-Key'] =
                            plain;
                    } else {
                        const sep = url.includes('?') ? '&' : '?';
                        const param = config.httpAuth.paramName ?? 'api_key';
                        url += `${sep}${encodeURIComponent(param)}=${encodeURIComponent(plain)}`;
                    }
                    break;
                case 'basic':
                    headers['Authorization'] =
                        `Basic ${Buffer.from(plain).toString('base64')}`;
                    break;
            }
        }

        const method = config.httpMethod ?? 'POST';
        const init: RequestInit = {
            method,
            headers,
            body: ['GET', 'DELETE'].includes(method)
                ? undefined
                : JSON.stringify(args),
        };

        const attempts = config.maxRetries ?? 1;
        let lastErr: string | undefined;
        let isTimeout = false;
        for (let i = 0; i <= attempts; i++) {
            const controller = new AbortController();
            const timer = setTimeout(
                () => controller.abort(),
                config.timeoutMs ?? 10000
            );
            try {
                const res = await this.egress.fetch(url, {
                    ...init,
                    signal: controller.signal,
                });
                clearTimeout(timer);
                const body = await res.text();
                const parsed = body ? this.tryParse(body) : undefined;
                if (res.ok) {
                    return {
                        status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
                        result: parsed,
                        durationMs: Date.now() - started,
                    };
                }
                const errorMsg = `HTTP ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`;
                if (res.status >= 400 && res.status < 500) {
                    return {
                        status: ENUM_TOOL_INVOCATION_STATUS.ERROR,
                        errorMessage: errorMsg,
                        durationMs: Date.now() - started,
                    };
                }
                lastErr = errorMsg;
                isTimeout = false;
            } catch (err: any) {
                clearTimeout(timer);
                if (err?.name === 'AbortError') {
                    lastErr = 'timeout';
                    isTimeout = true;
                } else {
                    lastErr = err instanceof Error ? err.message : String(err);
                    isTimeout = false;
                }
            }
        }
        return {
            status: isTimeout
                ? ENUM_TOOL_INVOCATION_STATUS.TIMEOUT
                : ENUM_TOOL_INVOCATION_STATUS.ERROR,
            errorMessage: lastErr,
            durationMs: Date.now() - started,
        };
    }

    private tryParse(body: string): unknown {
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }
}
