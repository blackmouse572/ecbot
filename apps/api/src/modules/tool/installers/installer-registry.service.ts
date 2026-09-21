import { BadRequestException, Injectable } from '@nestjs/common';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ComposioToolkitInstaller } from './composio-toolkit-installer';
import { EcchoToolkitInstaller } from './eccho-toolkit-installer';
import { OperatorToolkitInstaller } from './operator-toolkit-installer';
import { ToolkitInstaller } from './toolkit-installer.interface';

@Injectable()
export class InstallerRegistry {
    private readonly map: Map<ENUM_MCP_PROVIDER, ToolkitInstaller>;

    constructor(
        private readonly composio: ComposioToolkitInstaller,
        private readonly operator: OperatorToolkitInstaller,
        private readonly eccho: EcchoToolkitInstaller
    ) {
        this.map = new Map<ENUM_MCP_PROVIDER, ToolkitInstaller>([
            [ENUM_MCP_PROVIDER.COMPOSIO, composio],
            [ENUM_MCP_PROVIDER.OPERATOR, operator],
            [ENUM_MCP_PROVIDER.ECCHO, eccho],
        ]);
    }

    get(provider: ENUM_MCP_PROVIDER): ToolkitInstaller {
        const installer = this.map.get(provider);
        if (!installer) {
            throw new BadRequestException(`Unknown provider: ${provider}`);
        }
        return installer;
    }
}
