import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    NotImplementedException,
} from '@nestjs/common';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ToolInvocationRepository } from 'src/modules/tool/repository/repositories/tool-invocation.repository';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import {
    HttpToolExecutorService,
    ExecutionResult,
} from './http-tool-executor.service';
import { McpToolExecutorService } from 'src/modules/tool/services/mcp-tool-executor.service';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';

export interface ExecuteCommand {
    toolId: string;
    actionName?: string;
    args: Record<string, unknown>;
    chatbotId: string;
    conversationId?: string;
    correlationId: string;
}

export interface ExecuteOutcome extends ExecutionResult {
    invocationId: string;
}

@Injectable()
export class ToolExecutionService {
    private readonly logger = new Logger(ToolExecutionService.name);
    constructor(
        private readonly toolRepo: ToolRepository,
        private readonly invocationRepo: ToolInvocationRepository,
        private readonly chatbotToolRepo: ChatbotToolRepository,
        private readonly http: HttpToolExecutorService,
        private readonly mcp: McpToolExecutorService
    ) {}

    async execute(cmd: ExecuteCommand): Promise<ExecuteOutcome> {
        // MCP per-action: id format is `<toolId>:<actionName>`. Split before lookup.
        this.logger.debug(`Executing command: ${JSON.stringify(cmd)}`);
        let toolId = cmd.toolId;
        let actionName = cmd.actionName;
        if (cmd.toolId.includes(':')) {
            const [parsedToolId, parsedAction] = cmd.toolId.split(':', 2);
            toolId = parsedToolId;
            if (!actionName) actionName = parsedAction;
        }
        const tool = await this.toolRepo.findOne({
            id: toolId,
            deleted: false,
        });
        if (!tool) {
            this.logger.warn(`Tool not found: ${toolId}`);
            throw new NotFoundException('tool.get.error.notFound');
        }

        const link = await this.chatbotToolRepo.findOneByChatbotAndTool(
            cmd.chatbotId,
            toolId
        );
        if (!link || !link.enabled) {
            this.logger.warn(
                `Tool ${toolId} is not enabled for chatbot ${cmd.chatbotId}`
            );
            throw new ForbiddenException('tool.execute.error.notLinked');
        }
        if (
            actionName &&
            link.enabledActions &&
            link.enabledActions.length > 0 &&
            !link.enabledActions.includes(actionName)
        ) {
            this.logger.warn(
                `Action ${actionName} on tool ${toolId} is not enabled for chatbot ${cmd.chatbotId}`
            );
            throw new ForbiddenException('tool.execute.error.notLinked');
        }

        let result: ExecutionResult;
        const startTime = Date.now();
        switch (tool.kind) {
            case ENUM_TOOL_KIND.HTTP:
                result = await this.http.execute(tool, cmd.args);
                break;
            case ENUM_TOOL_KIND.MCP:
                if (!actionName) {
                    throw new BadRequestException(
                        'MCP tool requires actionName'
                    );
                }
                result = await this.mcp.execute(tool, actionName, cmd.args);
                break;
            default:
                throw new NotImplementedException(
                    `unsupported tool kind ${tool.kind}`
                );
        }
        const duration = Date.now() - startTime;
        if (result.durationMs === undefined) {
            result.durationMs = duration;
        } else {
            // In case the executor didn't set durationMs, use the measured duration.
            result.durationMs = Math.max(result.durationMs, duration);
        }

        this.logger.debug(
            `Tool execution completed in ${result.durationMs}ms with status ${result.status}`
        );

        if (result.status === 'ERROR')
            this.logger.error(`ERROR: ${result.errorMessage}`);

        const em = this.invocationRepo.getEntityManager();
        const invocation = this.invocationRepo.create({
            tool: em.getReference(ToolEntity, toolId),
            chatbot: em.getReference(ChatbotEntity, cmd.chatbotId),
            conversationId: cmd.conversationId,
            correlationId: cmd.correlationId,
            status: result.status,
            actionName: actionName,
            inputArgs: cmd.args,
            outputResult: stripBlobs(result.result),
            errorMessage: result.errorMessage,
            durationMs: result.durationMs,
        });
        await em.persistAndFlush(invocation);
        return { ...result, invocationId: invocation.id };
    }
}

const BLOB_PLACEHOLDER = '[binary content stripped]';
const BLOB_KEYS = new Set(['data', 'blob']);
const BLOB_TYPES = new Set(['image', 'audio', 'resource']);

function stripBlobs(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripBlobs);
    if (!value || typeof value !== 'object') return value;
    const obj = value as Record<string, unknown>;
    const type = typeof obj.type === 'string' ? obj.type : undefined;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (
            BLOB_KEYS.has(k) &&
            typeof v === 'string' &&
            (type === undefined || BLOB_TYPES.has(type))
        ) {
            out[k] = BLOB_PLACEHOLDER;
            out[`${k}Size`] = v.length;
        } else {
            out[k] = stripBlobs(v);
        }
    }
    return out;
}
