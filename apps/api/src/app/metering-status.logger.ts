import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    Optional,
} from '@nestjs/common';
import { AI_USAGE_METER, AiUsageMeter } from 'src/app/ai-usage-meter.interface';
import {
    WORKSPACE_CREATED_HOOK,
    WorkspaceCreatedHook,
} from 'src/modules/workspace/interfaces/workspace-created-hook.interface';

// Both seams are @Optional(), so a build that lost its provider would boot
// unmetered without a trace — this logger is that trace.
@Injectable()
export class MeteringStatusLogger implements OnApplicationBootstrap {
    private readonly logger = new Logger(MeteringStatusLogger.name);

    constructor(
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter,
        @Optional()
        @Inject(WORKSPACE_CREATED_HOOK)
        private readonly hook?: WorkspaceCreatedHook
    ) {}

    onApplicationBootstrap(): void {
        this.logger.log(
            `AI usage metering: ${this.meter ? 'enabled' : 'disabled'}; workspace-created hook: ${this.hook ? 'enabled' : 'disabled'}`
        );
    }
}
