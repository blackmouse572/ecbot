import { Injectable } from '@nestjs/common';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ToolSpec } from 'src/modules/tool/interfaces/tool-spec.interface';

@Injectable()
export class ManifestBuilderService {
    constructor(private readonly chatbotToolRepo: ChatbotToolRepository) {}

    // Anthropic requires root schema type to be "object"; Composio sometimes sends null.
    private normalizeSchema(
        schema: Record<string, unknown>
    ): Record<string, unknown> {
        if (!schema.type || schema.type === null) {
            return { ...schema, type: 'object' };
        }
        return schema;
    }

    async build(chatbotId: string, workspaceId: string): Promise<ToolSpec[]> {
        const rows = await this.chatbotToolRepo.findEnabledByChatbotId(
            chatbotId,
            workspaceId
        );
        const specs: ToolSpec[] = [];
        for (const row of rows) {
            const t = row.tool;
            if (!t || t.deleted) continue;
            if (t.kind === ENUM_TOOL_KIND.HTTP) {
                specs.push({
                    id: t.id,
                    name: t.slug,
                    description: t.description,
                    inputSchema: this.normalizeSchema(
                        t.httpInputSchema ?? { type: 'object', properties: {} }
                    ),
                });
            } else if (t.kind === ENUM_TOOL_KIND.MCP) {
                const discovered = t.discoveredActions ?? [];
                if (discovered.length === 0) continue;
                const enabled = row.enabledActions;
                const actions =
                    enabled == null
                        ? discovered
                        : discovered.filter(a => enabled.includes(a.name));
                for (const action of actions) {
                    specs.push({
                        id: `${t.id}:${action.name}`,
                        name: `${t.slug}__${action.name}`, // __ separator, no slugify
                        description: action.description || t.description,
                        inputSchema: this.normalizeSchema(
                            action.inputSchema || {
                                type: 'object',
                                properties: {},
                            }
                        ),
                    });
                }
            }
        }
        return specs;
    }
}
