import { Injectable, Logger } from '@nestjs/common';
import { McpDiscoveryService } from 'src/modules/tool/services/mcp-discovery.service';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import type { ExecutionResult } from 'src/modules/tool/services/http-tool-executor.service';

@Injectable()
export class McpToolExecutorService {
    private readonly logger = new Logger(McpToolExecutorService.name);

    constructor(private readonly discovery: McpDiscoveryService) {}

    async execute(
        tool: ToolEntity,
        actionName: string,
        args: Record<string, unknown>
    ): Promise<ExecutionResult> {
        const started = Date.now();
        let client:
            | {
                  callTool: (req: unknown) => Promise<unknown>;
                  close: () => Promise<void>;
              }
            | undefined;
        try {
            client = (await this.discovery.connect(tool)) as unknown as {
                callTool: (req: unknown) => Promise<unknown>;
                close: () => Promise<void>;
            };
            this.logger.debug(`MCP Execute [${actionName}]`, { args });
            const res: any = await client.callTool({
                name: actionName,
                arguments: args,
            });
            if (res?.isError) {
                const errText = Array.isArray(res.content)
                    ? res.content
                          .map((c: any) => c?.text ?? JSON.stringify(c))
                          .join('')
                    : typeof res.content === 'string'
                      ? res.content
                      : JSON.stringify(res.content);
                return {
                    status: ENUM_TOOL_INVOCATION_STATUS.ERROR,
                    errorMessage: errText,
                    durationMs: Date.now() - started,
                };
            }
            return {
                status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
                result: res?.content,
                durationMs: Date.now() - started,
            };
        } catch (err: any) {
            return {
                status: ENUM_TOOL_INVOCATION_STATUS.ERROR,
                errorMessage: String(err?.message ?? err),
                durationMs: Date.now() - started,
            };
        } finally {
            try {
                await client?.close();
            } catch {
                /* ignore */
            }
        }
    }
}
