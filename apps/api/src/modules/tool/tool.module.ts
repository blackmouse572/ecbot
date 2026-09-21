import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AiCacheModule } from 'src/modules/ai-cache/ai-cache.module';
import { Module } from '@nestjs/common';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ChatbotToolEntity } from 'src/modules/tool/repository/entities/chatbot-tool.entity';
import { ToolInvocationEntity } from 'src/modules/tool/repository/entities/tool-invocation.entity';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolInvocationRepository } from 'src/modules/tool/repository/repositories/tool-invocation.repository';
import { ToolInstallSessionRepository } from 'src/modules/tool/repository/repositories/tool-install-session.repository';
import { ToolService } from 'src/modules/tool/services/tool.service';
import { ChatbotToolService } from 'src/modules/tool/services/chatbot-tool.service';
import { HttpToolExecutorService } from 'src/modules/tool/services/http-tool-executor.service';
import { ToolExecutionService } from 'src/modules/tool/services/tool-execution.service';
import { ManifestBuilderService } from 'src/modules/tool/services/manifest-builder.service';
import { ComposioCatalogService } from 'src/modules/tool/services/composio-catalog.service';
import { EcchoCatalogService } from 'src/modules/tool/services/eccho-catalog.service';
import { McpDiscoveryService } from 'src/modules/tool/services/mcp-discovery.service';
import { McpToolExecutorService } from 'src/modules/tool/services/mcp-tool-executor.service';
import { SlugMinter } from 'src/modules/tool/services/slug-minter.service';
import { ComposioToolkitInstaller } from 'src/modules/tool/installers/composio-toolkit-installer';
import { OperatorToolkitInstaller } from 'src/modules/tool/installers/operator-toolkit-installer';
import { EcchoToolkitInstaller } from 'src/modules/tool/installers/eccho-toolkit-installer';
import { InstallerRegistry } from 'src/modules/tool/installers/installer-registry.service';
import { ToolInvocationPruneScheduler } from 'src/modules/tool/schedulers/tool-invocation-prune.scheduler';
import { ToolInstallSessionPruneScheduler } from 'src/modules/tool/schedulers/tool-install-session-prune.scheduler';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            ToolEntity,
            ChatbotToolEntity,
            ToolInvocationEntity,
            ToolInstallSessionEntity,
        ]),
        AiCacheModule,
    ],
    providers: [
        ToolRepository,
        ChatbotToolRepository,
        ToolInvocationRepository,
        ToolInstallSessionRepository,
        ToolService,
        ChatbotToolService,
        HttpToolExecutorService,
        ToolExecutionService,
        ManifestBuilderService,
        McpDiscoveryService,
        McpToolExecutorService,
        ComposioCatalogService,
        EcchoCatalogService,
        SlugMinter,
        ComposioToolkitInstaller,
        OperatorToolkitInstaller,
        EcchoToolkitInstaller,
        InstallerRegistry,
        ToolInvocationPruneScheduler,
        ToolInstallSessionPruneScheduler,
    ],
    exports: [
        ToolRepository,
        ChatbotToolRepository,
        ToolInvocationRepository,
        ToolService,
        ChatbotToolService,
        HttpToolExecutorService,
        ToolExecutionService,
        ManifestBuilderService,
        McpDiscoveryService,
        McpToolExecutorService,
        ComposioCatalogService,
        EcchoCatalogService,
        ToolInstallSessionRepository,
        InstallerRegistry,
    ],
    controllers: [], // per project convention — controllers register in routes.{access}.module.ts
})
export class ToolModule {}
