import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    Optional,
} from '@nestjs/common';
import { AI_USAGE_METER, AiUsageMeter } from 'src/app/ai-usage-meter.interface';
import {
    KB_STORAGE_LIMIT,
    KbStorageLimit,
} from 'src/modules/knowledge-base/interfaces/kb-storage-limit.interface';
import {
    CUSTOMER_LIMIT,
    CustomerLimit,
} from 'src/modules/customer/interfaces/customer-limit.interface';
import {
    WORKSPACE_SEAT_LIMIT,
    WorkspaceSeatLimit,
} from 'src/modules/workspace/interfaces/workspace-seat-limit.interface';
import {
    WORKSPACE_CREATED_HOOK,
    WorkspaceCreatedHook,
} from 'src/modules/workspace/interfaces/workspace-created-hook.interface';

// Every seam is @Optional(), so a build that lost its provider would boot
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
        private readonly hook?: WorkspaceCreatedHook,
        @Optional()
        @Inject(KB_STORAGE_LIMIT)
        private readonly kbStorageLimit?: KbStorageLimit,
        @Optional()
        @Inject(WORKSPACE_SEAT_LIMIT)
        private readonly seatLimit?: WorkspaceSeatLimit,
        @Optional()
        @Inject(CUSTOMER_LIMIT)
        private readonly customerLimit?: CustomerLimit
    ) {}

    onApplicationBootstrap(): void {
        this.logger.log(
            `AI usage metering: ${this.meter ? 'enabled' : 'disabled'}; workspace-created hook: ${this.hook ? 'enabled' : 'disabled'}; KB storage limit: ${this.kbStorageLimit ? 'enabled' : 'disabled'}; seat limit: ${this.seatLimit ? 'enabled' : 'disabled'}; customer limit: ${this.customerLimit ? 'enabled' : 'disabled'}`
        );
    }
}
